import { productService } from './productService.js';
import { categoryService } from './categoryService.js';
import { offerService } from './offerService.js';
import { settingsService } from './settingsService.js';
import { computeIsOpenFromHours } from './dashboardService.js';

function sanitizePublicProduct(item) {
  if (!item) return null;

  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    imageUrl: item.imageUrl ?? null,
    price: item.price,
    categoryId: item.categoryId,
    offer: item.offer
      ? {
          discountPercent: item.offer.discountPercent,
          finalPrice: item.offer.finalPrice,
          isActive: Boolean(item.offer.isActive)
        }
      : null
  };
}

function sanitizePublicCategory(item) {
  if (!item) return null;

  return {
    id: item.id,
    name: item.name,
    imageUrl: item.imageUrl ?? null
  };
}

function sanitizePublicOffer(item) {
  if (!item || !item.product) return null;

  return {
    id: item.id,
    discountPercent: item.discountPercent,
    finalPrice: item.finalPrice,
    product: {
      id: item.product.id,
      name: item.product.name,
      description: item.product.description ?? null,
      imageUrl: item.product.imageUrl ?? null,
      price: item.product.price,
      categoryId: item.product.categoryId
    }
  };
}

export const publicCatalogService = {
  async listProducts() {
    const { items } = await productService.listProducts({
      all: true,
      status: 'active',
      orderBy: 'name',
      orderDir: 'asc'
    });

    return items.map(sanitizePublicProduct).filter(Boolean);
  },

  async listCategories() {
    const { items } = await categoryService.listCategories({
      all: true,
      status: 'active',
      orderBy: 'name',
      orderDir: 'asc'
    });

    return items.map(sanitizePublicCategory).filter(Boolean);
  },

  async listOffers() {
    const { items } = await offerService.listOffers({
      all: true,
      activeOnly: true,
      status: 'active',
      orderBy: 'updatedAt',
      orderDir: 'desc'
    });

    return items.map(sanitizePublicOffer).filter(Boolean);
  },

  async getPublicSettings() {
    return settingsService.getPublicSettingsContract();
  },

  async getBusinessStatus() {
    const data = await settingsService.getPublicSettings();
    const mode = data?.hours?.override ?? 'AUTO';

    return {
      isOpen: computeIsOpenFromHours(data?.hours),
      mode,
      timezone: data?.hours?.timezone ?? 'America/Argentina/San_Luis',
      alert: {
        enabled: Boolean(data?.hours?.alert?.enabled),
        message: data?.hours?.alert?.message ?? ''
      }
    };
  },

  async getCommercialConfig() {
    const data = await settingsService.getPublicSettings();

    return {
      whatsapp: {
        number: data?.whatsapp?.number ?? '',
        message: data?.whatsapp?.message ?? ''
      },
      contact: {
        phone: data?.identity?.phone ?? '',
        email: data?.identity?.email ?? '',
        address: data?.identity?.address ?? ''
      },
      socialLinks: Array.isArray(data?.socialLinks) ? data.socialLinks : []
    };
  }
};
