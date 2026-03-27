function assertString(value, fieldName, { min = 1, max = 500, trim = true } = {}) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const normalized = trim ? value.trim() : value;

  if (normalized.length < min) {
    throw new Error(`${fieldName} is required`);
  }

  if (normalized.length > max) {
    throw new Error(`${fieldName} is too long`);
  }

  return normalized;
}

function assertOptionalString(value, fieldName, { max = 500, trim = true } = {}) {
  if (value == null || value === "") return null;
  return assertString(value, fieldName, { min: 1, max, trim });
}

function assertEmail(value, fieldName = "email") {
  const email = assertString(value, fieldName, { min: 5, max: 320 }).toLowerCase();
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) {
    throw new Error(`${fieldName} is invalid`);
  }
  return email;
}

function assertPassword(value, fieldName = "password") {
  const password = assertString(value, fieldName, { min: 8, max: 128, trim: false });
  return password;
}

function assertCoordinates(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("latitude is invalid");
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("longitude is invalid");
  }

  return { latitude, longitude };
}

function assertOrderStatus(value) {
  const allowed = ["pending", "accepted", "ready", "completed", "cancelled", "rejected"];
  if (!allowed.includes(value)) {
    throw new Error("status is invalid");
  }
  return value;
}

module.exports = {
  assertString,
  assertOptionalString,
  assertEmail,
  assertPassword,
  assertCoordinates,
  assertOrderStatus,
};
