export function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function findNearestBranch(branches, userLat, userLng, maxKm = 100) {
  let nearest = null
  let minDist = Infinity

  for (const branch of branches) {
    if (!branch.latitude || !branch.longitude) continue
    const d = haversineKm(userLat, userLng, branch.latitude, branch.longitude)
    if (d < minDist && d <= maxKm) {
      minDist = d
      nearest = {
        ...branch,
        distanceKm:    d,
        distanceLabel: d < 1 ? `${Math.round(d * 1000)} م` : `${d.toFixed(1)} كم`
      }
    }
  }
  return nearest
}
