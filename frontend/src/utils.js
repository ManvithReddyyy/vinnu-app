export function getImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  // Check if we're on mobile (accessing via IP)
  const hostname = window.location.hostname;
  
  if (hostname === '192.168.0.105') {
    return `http://192.168.0.105:5000${path}`;
  }
  
  // Default to localhost
  return `http://localhost:5000${path}`;
}

// Get API base URL
export function getApiBase() {
  const hostname = window.location.hostname;
  
  if (hostname === '192.168.0.105') {
    return 'http://192.168.0.105:5000';
  }
  
  return ''; // Use proxy
}
