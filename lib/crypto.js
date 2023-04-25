import bcrypt from "bcrypt";
import crypto from "crypto";
export async function encrypt(text, key) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(key, "hex"), // fungerte ikke med valig streng så konverter
      iv
    );
    const encrypted = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
    ]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (error) {
    console.log("====================================");
    console.log("bad encryption ", error);
    console.log("====================================");
  }
}

export async function decrypt(text, key) {
  try {
    const [ivText, encryptedText] = text.split(":"); // splitter slik vi får ut kodet tekst å random teksten
    const iv = Buffer.from(ivText, "hex"); // fungerte ikke med valig streng så konverter
    const encrypted = Buffer.from(encryptedText, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(key, "hex"), // igjen samme problemet
      iv
    );
    return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
  } catch (error) {
    console.log("====================================");
    console.log("bad decrytion ", error);
    console.log("====================================");
  }
}

// Example usage

//legger på brukeren og rolle til req hvis den finner brukeren, så kan eg bruke dette andre plasser til å begrense tilgang
export async function comparePassword(plaintextPassword, hash) {
  const result = await bcrypt.compare(plaintextPassword, hash);

  return result;
}
export async function hashPassword(plaintextPassword) {
  return await bcrypt.hash(plaintextPassword, 10);
}
