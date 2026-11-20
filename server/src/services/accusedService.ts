export function formatRecordId(createdAt: Date, id: number): string {
  const year = createdAt ? new Date(createdAt).getFullYear() : 2026
  return `SPS-ACC-${year}-${String(id).padStart(4, '0')}`
}

export function formatMobileNumber(mobile: string): string {
  if (mobile && mobile.length === 10) {
    return `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`
  }
  return mobile || ''
}

export function serializeAccused(accused: any): any {
  return {
    id: accused.id,
    record_id: formatRecordId(accused.createdAt, accused.id),
    full_name: accused.fullName,
    mobile_number: accused.mobileNumber,
    formatted_mobile: formatMobileNumber(accused.mobileNumber),
    detailed_address: accused.detailedAddress,
    village: accused.village,
    city: accused.city,
    taluka: accused.taluka,
    district: accused.district,
    state: accused.state,
    pincode: accused.pincode,
    latitude: accused.latitude,
    longitude: accused.longitude,
    location_status: accused.locationStatus,
    location_accuracy: accused.locationAccuracy,
    geocoded_query: accused.geocodedQuery || '',
    geocoded_display_name: accused.geocodedDisplayName || '',
    geocoded_at: accused.geocodedAt ? new Date(accused.geocodedAt).toISOString() : null,
    verified_by: accused.verifiedBy
      ? accused.verifiedBy.fullName || accused.verifiedBy.username
      : null,
    verified_at: accused.verifiedAt ? new Date(accused.verifiedAt).toISOString() : null,
    created_at: new Date(accused.createdAt).toISOString(),
    updated_at: new Date(accused.updatedAt).toISOString(),
    photo_count: accused._count?.photos ?? accused.photos?.length ?? 0,
  }
}

export function serializeLocationCheck(check: any): any {
  return {
    action: check.action,
    latitude: check.latitude,
    longitude: check.longitude,
    location_status: check.locationStatus,
    location_accuracy: check.locationAccuracy,
    note: check.note || '',
    timestamp: new Date(check.timestamp).toISOString(),
    officer: check.officer ? check.officer.fullName || check.officer.username : null,
  }
}
