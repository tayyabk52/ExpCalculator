/**
 * PWA Icon Generator Script
 * Run this with: node scripts/generate-icons.js
 * 
 * This creates placeholder icons for the PWA.
 * Replace these with your actual app icons later.
 */

const fs = require('fs');
const path = require('path');

// SVG template for the icon
function createSVG(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#10b981" rx="${size * 0.15}"/>
  
  <!-- Calculator Icon -->
  <g transform="translate(${size * 0.25}, ${size * 0.25})">
    <rect width="${size * 0.5}" height="${size * 0.5}" fill="white" rx="${size * 0.05}"/>
    
    <!-- Display -->
    <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.3}" height="${size * 0.08}" fill="#10b981" rx="${size * 0.01}"/>
    
    <!-- Buttons -->
    <circle cx="${size * 0.15}" cy="${size * 0.28}" r="${size * 0.03}" fill="#10b981"/>
    <circle cx="${size * 0.25}" cy="${size * 0.28}" r="${size * 0.03}" fill="#10b981"/>
    <circle cx="${size * 0.35}" cy="${size * 0.28}" r="${size * 0.03}" fill="#10b981"/>
    
    <circle cx="${size * 0.15}" cy="${size * 0.38}" r="${size * 0.03}" fill="#10b981"/>
    <circle cx="${size * 0.25}" cy="${size * 0.38}" r="${size * 0.03}" fill="#10b981"/>
    <circle cx="${size * 0.35}" cy="${size * 0.38}" r="${size * 0.03}" fill="#10b981"/>
  </g>
</svg>`;
}

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate icons
console.log('🎨 Generating PWA icons...');

const sizes = [192, 512];

sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = `icon-${size}.svg`;
  const filepath = path.join(publicDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✅ Created ${filename}`);
});

console.log('\n📝 Note: SVG icons created. For production, convert these to PNG using:');
console.log('   - Online tool: https://svgtopng.com/');
console.log('   - Or use imagemagick: convert icon-192.svg icon-192.png');
console.log('\n✨ PWA icons generated successfully!');
