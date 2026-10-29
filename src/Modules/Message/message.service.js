const messageRepository = require('../../repositories/message.repository');
const userRepository = require('../../repositories/user.repository');
const storageService = require('../../services/storage.service');
const { encrypt, decrypt } = require('../../utils/encryption.util');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/ApiError');

async function send({ receiver, content, isAnonymous, senderId, file, provider = 'cloudinary' }) {
  const receiverExists = await userRepository.exists({ _id: receiver });
  if (!receiverExists) throw new NotFoundError('Recipient does not exist');
  if (receiver === senderId) throw new BadRequestError('You cannot send a confession to yourself');

  let attachment = { url: null, publicId: null };
  if (file) {
    attachment =
      provider === 'cloudinary'
        ? await storageService.uploadToCloudinary(file.buffer, 'confession-app/messages')
        : storageService.uploadLocalFile(file);
  }

  return messageRepository.create({
    receiver,
    content,
    isAnonymous,
    
    senderEncrypted: isAnonymous ? null : encrypt(senderId),
    attachment,
  });
}

async function listInbox(userId, { page, limit } = {}) {
  const result = await messageRepository.findByReceiver(userId, { page, limit });
  result.items = result.items.map((m) => decorateSender(m));
  return result;
}

async function markRead(messageId, userId) {
  const message = await messageRepository.findById(messageId);
  if (!message) throw new NotFoundError('Message not found');
  if (message.receiver !== userId) throw new ForbiddenError('This is not your message');
  return messageRepository.markAsRead(messageId);
}

async function remove(messageId, userId) {
  const message = await messageRepository.findById(messageId);
  if (!message) throw new NotFoundError('Message not found');
  if (message.receiver !== userId) throw new ForbiddenError('This is not your message');
  if (message.attachment?.publicId) await storageService.remove(message.attachment.publicId);
  return messageRepository.deleteById(messageId);
}


function decorateSender(message) {
  const obj = message.toObject ? message.toObject() : message;
  if (!obj.isAnonymous && obj.senderEncrypted) {
    obj.sender = decrypt(obj.senderEncrypted);
  }
  delete obj.senderEncrypted;
  return obj;
}

module.exports = { send, listInbox, markRead, remove };