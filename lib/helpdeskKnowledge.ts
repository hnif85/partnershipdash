import { pool } from "./database";
import { getProductKnowledge } from "./knowledge/productData";

export async function getProductKnowledgeFromDB(): Promise<string> {
  try {
    const result = await pool.query(`
      SELECT content FROM helpdesk_product_knowledge
      ORDER BY updated_at DESC LIMIT 1
    `);

    if (result.rows.length > 0 && result.rows[0].content) {
      return result.rows[0].content;
    }
  } catch (error) {
    console.error("Failed to fetch product knowledge from DB:", error);
  }

  return getProductKnowledge();
}