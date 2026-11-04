const crypto = require('crypto');
exports.encrypt = (buf, hex) => {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', Buffer.from(hex, 'hex'), iv);
  const e = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), e]);
};
exports.decrypt = (bin, hex) => {
  const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(hex, 'hex'), bin.subarray(0, 12));
  d.setAuthTag(bin.subarray(12, 28));
  return Buffer.concat([d.update(bin.subarray(28)), d.final()]);
};
