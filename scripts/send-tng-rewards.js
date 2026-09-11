// NetBijak.com - 批次发送TNG Pin奖励（ZIP加密 + Resend寄信）
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function fetchFromSupabase(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function updateSupabase(table, id, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function assignPin(amount) {
  const pins = await fetchFromSupabase('reward_pins', `amount=eq.${amount}&is_used=eq.false&limit=1`);
  if (!pins || pins.length === 0) return null;
  return pins[0];
}

async function createEncryptedZip(customerName, pinCode, amount, password, outputPath, tmpDir) {
  const content = `NetBijak Reward - Touch 'n Go Pin\n\nDear ${customerName},\n\nCongratulations! Here is your Touch 'n Go eWallet Pin reward:\n\nAmount: RM${amount}\nPin Code: ${pinCode}\n\nThank you for choosing NetBijak!\n`;

  const txtFileName = 'NetBijak_TNG_Reward.txt';
  const txtPath = path.join(tmpDir, txtFileName);
  fs.writeFileSync(txtPath, content);

  const absoluteZipPath = path.resolve(outputPath);

  // 用系统内建的 zip 指令，-P 指定密码，-j 只放文件本身不含路径
  execSync(`zip -P "${password}" -j "${absoluteZipPath}" "${txtPath}"`);

  fs.unlinkSync(txtPath);
}

async function sendRewardEmail(toEmail, customerName, zipPath, amount) {
  const zipBuffer = fs.readFileSync(zipPath);
  const zipBase64 = zipBuffer.toString('base64');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'NetBijak Rewards <rewards@netbijak.com>',
      to: [toEmail],
      subject: `🎉 Your NetBijak Reward - RM${amount} Touch 'n Go Pin`,
      html: `
        <p>Dear ${customerName},</p>
        <p>Congratulations! Thank you for choosing NetBijak.</p>
        <p>Your RM${amount} Touch 'n Go eWallet Pin reward is attached in the encrypted ZIP file below.</p>
        <p><strong>To open the file, use the password: the last 6 digits of your IC number.</strong></p>
        <p>Thank you again for your support!</p>
        <p>— NetBijak Team</p>
      `,
      attachments: [
        {
          filename: 'NetBijak_TNG_Reward.zip',
          content: zipBase64,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API error: ${res.status} ${errText}`);
  }
}

async function run() {
  console.log('Fetching queued rewards...');
  const queueItems = await fetchFromSupabase('reward_send_queue', 'status=eq.queued&select=*');

  console.log(`Found ${queueItems.length} queued items.`);

  const tmpDir = 'tmp-rewards';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  for (const item of queueItems) {
        try {
      const customers = await fetchFromSupabase('customers', `id=eq.${item.customer_id}&select=*`);
      const customer = customers[0];

      if (!customer) throw new Error('Customer not found');
      if (!customer.email || !customer.ic_last6) throw new Error('Missing email or IC number');
      if (!customer.reward_event_id) throw new Error('Customer has no reward event assigned');

      const events = await fetchFromSupabase('reward_events', `id=eq.${customer.reward_event_id}&select=tng_amount`);
      const event = events[0];

      if (!event || !event.tng_amount) throw new Error('Event has no TNG amount configured');

      const amount = event.tng_amount;

      console.log(`  Processing: ${customer.customer_name} (RM${amount})`);

      const pin = await assignPin(amount);
      if (!pin) throw new Error(`No available pins for amount RM${amount}`);

            const zipPath = path.join(tmpDir, `reward_${customer.id}.zip`);
      await createEncryptedZip(customer.customer_name, pin.pin_code, amount, customer.ic_last6, zipPath, tmpDir);
      await sendRewardEmail(customer.email, customer.customer_name, zipPath, amount);

      await updateSupabase('reward_pins', pin.id, {
        is_used: true,
        assigned_to_customer_id: customer.id,
        assigned_at: new Date().toISOString(),
      });

      await updateSupabase('customers', customer.id, {
        reward_status: 'sent',
        assigned_pin_id: pin.id,
        reward_sent_at: new Date().toISOString(),
      });

      await updateSupabase('reward_send_queue', item.id, {
        status: 'sent',
        processed_at: new Date().toISOString(),
      });

      fs.unlinkSync(zipPath);
      console.log(`    Sent successfully.`);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`  Failed for queue item ${item.id}:`, err.message);
      await updateSupabase('reward_send_queue', item.id, {
        status: 'failed',
        error_message: err.message,
        processed_at: new Date().toISOString(),
      });
    }
  }

  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});