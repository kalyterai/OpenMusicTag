export function deriveOutputPath(inputPath) {
  const raw = String(inputPath || '').trim();
  if (!raw) return '';

  const normalized = raw.replace(/[\\/]+$/, '');
  const slashIndex = normalized.lastIndexOf('/');
  const backslashIndex = normalized.lastIndexOf('\\');
  const index = Math.max(slashIndex, backslashIndex);
  const separator = backslashIndex > slashIndex ? '\\' : '/';

  const folderName = index >= 0 ? normalized.slice(index + 1) : normalized;
  if (!folderName) return '';

  const outputName = `${folderName}_OUTPUT`;
  if (index < 0) return outputName;

  const parent = normalized.slice(0, index);
  if (!parent) return `${separator}${outputName}`;
  return `${parent}${separator}${outputName}`;
}
