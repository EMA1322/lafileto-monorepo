import { prisma } from '../config/prisma.js';

export const settingRepository = {
  findByKey: (key) =>
    prisma.setting.findUnique({
      where: { key }
    }),

  updateByKey: (key, value) =>
    prisma.setting.update({
      where: { key },
      data: { value }
    }),

  upsertByKey: (key, value) =>
    prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })
};
