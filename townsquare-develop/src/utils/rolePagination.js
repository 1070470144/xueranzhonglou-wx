function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function hasMorePagedResults({ loadedCount, receivedCount, pageSize, total }) {
  const loaded = positiveNumber(loadedCount);
  const received = positiveNumber(receivedCount);
  const size = positiveNumber(pageSize);
  const knownTotal = positiveNumber(total);

  if (received <= 0) return false;
  if (knownTotal > 0) return loaded < knownTotal;
  return size > 0 && received >= size;
}

module.exports = {
  hasMorePagedResults,
};
