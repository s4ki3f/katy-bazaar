export function authorizeInventoryChange(role, current = {}, next = {}) {
  const roles = ['admin', 'staff'];
  if (!roles.includes(role)) {
    return { ok: false, errors: [{ code: 'unknown_role' }] };
  }

  if (role === 'admin') {
    return { ok: true };
  }

  const canonical = (state) => {
    const patches = {};
    Object.keys(state.patches ?? {}).sort().forEach(id => {
      patches[id] = {};
      Object.keys(state.patches[id]).sort().filter(field => field !== 'stock').forEach(field => {
        patches[id][field] = state.patches[id][field];
      });
    });
    return JSON.stringify({
      patches: patches,
      added: state.added ?? [],
      hidden: state.hidden ?? []
    });
  };

  if (canonical(current) !== canonical(next)) {
    return { ok: false, errors: [{ code: 'staff_may_only_change_stock' }] };
  }

  return { ok: true };
}