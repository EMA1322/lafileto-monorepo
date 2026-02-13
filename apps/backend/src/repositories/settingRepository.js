import { prisma } from '../config/prisma.js';

export const settingRepository = {
  findByKey: (key) =>
    prisma.setting.findUnique({
      where: { key }
    }),

  upsertByKey: (key, value) =>
    prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })
};

