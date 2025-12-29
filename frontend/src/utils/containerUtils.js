/**
 * Container name utilities
 * Handles normalization of Docker container names
 */

/**
 * Remove leading slash from container name
 * Docker API returns names like '/my-app12', but endpoints expect 'my-app12'
 */
export const normalizeContainerName = (name) => {
  if (!name) return '';
  return name.startsWith('/') ? name.substring(1) : name;
};

/**
 * Get display name for a container
 * Prefers the first name, with slash removed
 */
export const getContainerDisplayName = (container) => {
  if (!container) return 'Unknown';
  const name = container.names?.[0] || container.id;
  return normalizeContainerName(name);
};

/**
 * Get safe container name for API calls
 */
export const getSafeContainerName = (container) => {
  if (typeof container === 'string') {
    return normalizeContainerName(container);
  }
  return getContainerDisplayName(container);
};
