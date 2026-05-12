export function presentItem(item, extra = {}) {
  return { item, ...extra };
}

export function presentList(items, extra = {}) {
  return { items, total: items.length, ...extra };
}

export function presentAuthSession(token, user) {
  return { token, user };
}

export function presentUser(user) {
  return { user };
}

export function presentCategories(items, statuses) {
  return { items, statuses };
}

export function presentUpdatedCount(updated) {
  return { updated };
}
