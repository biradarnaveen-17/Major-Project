import { errorText, baseErrorText } from "../config.js";

export function displayError(error, registry, action) {
  const rawMessage = error?.shortMessage || error?.reason || error?.message || "Transaction failed.";
  const name = error?.revert?.name || error?.errorName;
  if (errorText[name]) return errorText[name];
  const rawData = [error?.data, error?.info?.error?.data, error?.error?.data].find((value) => typeof value === "string");
  if (rawData && registry) {
    try {
      const decoded = registry.interface.parseError(rawData);
      if (errorText[decoded?.name]) return errorText[decoded.name];
    } catch { /* Fall back to provider message */ }
  }
  const details = [error?.revert?.reason, error?.reason, error?.message, rawMessage].filter(Boolean).join(" ").toLowerCase();
  const match = baseErrorText.find(([fragment]) => details.includes(fragment));
  if (match) return match[1];

  if (rawMessage.includes("missing revert data") || error?.code === "CALL_EXCEPTION") {
    const isRegister = action === "register" || details.includes("registerland") || (typeof error?.transaction?.data === "string" && error.transaction.data.startsWith("0x4d133eed"));
    if (isRegister) {
      return "Registration rejected by Smart Contract: This physical parcel (Survey Number & Village) has already been registered on the blockchain! Under Karnataka land records rules, a parcel cannot be registered twice. Please create a request with a new Survey Number (e.g. 101/A) to register a new parcel.";
    }
    return "This land ID has not been registered on the active contract.";
  }

  return rawMessage;
}

export function shortAddress(value) {
  if (!value) return "Not connected";
  const str = typeof value === "string" ? value : (value.owner || value.address || String(value));
  if (typeof str !== "string" || str.length < 10) return String(str || "Not connected");
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
}

export function parcelMetadata(survey, district, taluk, hobli, village) {
  return [survey, village, hobli, taluk, district].map((value) => String(value || "").trim().toLowerCase()).join("|");
}
