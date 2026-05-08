import { pool } from "./database";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export async function detectAndStoreEmail(conversationId: number, textBody: string): Promise<boolean> {
  const emails = textBody.match(EMAIL_REGEX);
  
  if (emails && emails.length > 0) {
    const email = emails[0].toLowerCase();
    
    await pool.query(
      `UPDATE helpdesk_conversations_v2 
       SET customer_email = $2, updated_at = NOW() 
       WHERE id = $1 AND (customer_email IS NULL OR customer_email = '')`,
      [conversationId, email]
    );
    
    return true;
  }
  
  return false;
}

export function shouldAskForEmail(conversationData: any): boolean {
  return !conversationData.customer_email || conversationData.customer_email === "";
}