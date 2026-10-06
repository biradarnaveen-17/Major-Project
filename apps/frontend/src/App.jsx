import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  API_URL,
  RPC_URL,
  ADDRESSES,
  DEMO_ACCOUNTS,
  DEFAULT_DEMO_LAND_ID,
  NAV,
  PORTALS,
  COMMON_ABI,
  BASE_ABI,
  OPTIMIZED_ABI,
  statusText,
  errorText,
  DEMO_KEYS,
  KARNATAKA_REVENUE_HIERARCHY
} from "./config.js";
import { displayError, shortAddress, parcelMetadata } from "./utils/helpers.js";
import { Field, SelectField, Card, Metric, Pill } from "./components/UIComponents.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import RtcCertificateModal from "./components/RtcCertificateModal.jsx";
import EmailChangeModal from "./components/EmailChangeModal.jsx";
import BenchmarkDashboard from "./components/BenchmarkDashboard.jsx";

export default function BhoomiApp() {
