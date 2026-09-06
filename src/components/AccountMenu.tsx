"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { chatgizaSignOut } from "@/lib/signOutHelper";
import Link from "next/link";
import type { Tab as SettingsTab } from "@/components/SettingsPanel";
import { CHATGIZA_APK_URL, useInstallPrompt } from "@/lib/useInstallPrompt";

export type { SettingsTab };

const ChevronRightIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const CheckIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const DesktopIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

const MobileIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <path d="M11 18h2" />
  </svg>
);


const GearIcon = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

const AppsAlarmIcon = (
  <svg width="22" height="22" viewBox="0 0 256 256" fill="none">
    <path d="M0 0h256v256H0z" fill="none" />
    <path fill="#49bc82" d="M194.21 167.138a254 254 0 0 0 1.263-10.796a286 286 0 0 1-12.101 13.716q5.636-1.33 10.838-2.92M62.567 90.053a247 247 0 0 0-1.306 10.705a272 272 0 0 1 11.938-13.62a176 176 0 0 0-10.632 2.915m134.05 28.778a172 172 0 0 0 5.623-9.789a253 253 0 0 0-6.84-8.632a271 271 0 0 1 1.217 18.42M54.646 147.619q3.135 4.202 6.548 8.383A286 286 0 0 1 60.08 138.1a177 177 0 0 0-5.434 9.52m112.021 46.91c-1.576 5.02-3.315 9.735-5.207 14.097c-3.004 6.928-6.378 12.972-10.02 18.039c-6.914 9.62-14.794 15.68-22.984 17.27c-8.626-1.857-16.634-7.954-23.53-17.488c-6.782 2.546-13.407 4.353-19.788 5.36c2.06 2.852 4.239 5.497 6.549 7.889c9.93 10.279 18.6 16.138 36.663 16.138s28.292-6.633 38.543-18.168a74 74 0 0 0 4.446-5.55c3.807-5.218 7.195-11.18 10.153-17.787c3.285-7.342 6.042-15.473 8.272-24.234c-7.293 1.845-15.02 3.324-23.097 4.434m-.151-175.103C156.19 7.628 146.2.83 128.35.83s-24.2 5.023-33.67 13.926c-3.231 3.038-6.245 6.542-9.05 10.439c-3.655 5.079-6.942 10.845-9.847 17.204c-3.453 7.557-6.365 15.943-8.714 24.997c7.234-1.888 14.89-3.416 22.892-4.57c1.615-5.235 3.41-10.145 5.372-14.674c2.918-6.74 6.194-12.647 9.732-17.645c6.988-9.876 15.007-16.165 23.39-17.989c8.312 1.543 16.305 7.736 23.292 17.606c6.534-2.476 12.923-4.238 19.1-5.237a78 78 0 0 0-4.332-5.46m.418 43.301q-5.175-.718-10.528-1.231a271 271 0 0 1 13.413 11.766a176 176 0 0 0-2.885-10.535M89.848 194.37c3.594.52 7.253.97 10.977 1.34A286 286 0 0 1 86.9 183.434a173 173 0 0 0 2.949 10.936m143.066-15.982a74 74 0 0 0-.75-6.873c-.982-6.389-2.789-13.008-5.362-19.782c-2.896-7.622-6.755-15.436-11.453-23.325c-3.844 6.466-8.257 12.983-13.178 19.484c2.507 4.79 4.663 9.473 6.445 14.009c2.764 7.03 4.642 13.698 5.63 19.856c1.86 11.595.56 21.37-4.078 28.243c-7.343 4.742-17.198 6.116-28.676 4.329c-2.958 6.607-6.346 12.569-10.153 17.786c3.343.523 6.627.832 9.831.888c14.29.247 24.565-1.741 37.337-14.513s15.315-24.697 14.407-40.102M78.33 24.337c-15.644-1.041-27.514 1.215-40.137 13.838c-12.622 12.622-13.56 20.662-13.96 33.654c-.138 4.494.217 9.169 1.012 13.975c1.021 6.17 2.786 12.565 5.236 19.106c2.874 7.673 6.688 15.545 11.348 23.49c3.788-6.445 8.128-12.935 12.974-19.402c-2.483-4.714-4.636-9.332-6.415-13.806c-2.713-6.823-4.585-13.31-5.637-19.346c-2.095-12.022-.886-22.22 3.782-29.482c7.034-4.831 17.185-6.084 29.252-3.965c2.905-6.359 6.192-12.125 9.847-17.204a78 78 0 0 0-7.302-.858m117.072 76.073a247 247 0 0 0-1.244-10.215c-1.16-8.087-2.704-15.823-4.613-23.127c-2.29-8.764-5.107-16.903-8.435-24.26c-6.025 1.018-12.527 2.873-19.373 5.571c1.893 4.439 3.628 9.242 5.198 14.348a176 176 0 0 1 2.885 10.535c.898 3.727 1.707 7.59 2.422 11.578c1.366 7.602 2.38 15.66 3 24.098a264 264 0 0 1 .71 19.288c0 6.678-.257 13.157-.722 19.435c5.6-6.463 10.652-12.912 15.103-19.27a199 199 0 0 0 6.285-9.56a271 271 0 0 0-1.216-18.421M89.848 194.37a173 173 0 0 1-2.95-10.936c-.847-3.6-1.62-7.318-2.297-11.169c-1.362-7.738-2.356-15.976-2.96-24.622a278 278 0 0 1-.68-19.417c0-6.667.255-13.129.714-19.385c-5.615 6.484-10.665 12.978-15.136 19.397a202 202 0 0 0-6.459 9.862c.19 6.098.564 12.073 1.114 17.902c.349 3.693.763 7.331 1.255 10.896c1.104 7.99 2.572 15.637 4.395 22.86c2.243 8.882 5.03 17.117 8.354 24.547c6.17-1.025 12.821-2.917 19.827-5.696c-1.893-4.403-3.623-9.161-5.177-14.24M109.133 54.6a255 255 0 0 0-8.786 6.957a271 271 0 0 1 18.813-1.232a176 176 0 0 0-10.027-5.724M46.3 210.426c-4.83-7.033-6.084-17.185-3.963-29.252c-6.36-2.904-12.127-6.192-17.205-9.847c-.403 2.471-.7 4.91-.859 7.302c-1.04 15.644 1.216 27.515 13.838 40.136s20.662 13.56 33.655 13.96c4.306.133 8.777-.19 13.372-.916c-3.721-5.151-7.038-11.015-9.94-17.503c-11.767 1.954-21.753.711-28.898-3.88m62.65-8.279c-4.756 2.508-9.414 4.673-13.925 6.463c2.94 6.835 6.265 12.813 9.901 17.838c7.606-2.854 15.407-6.634 23.28-11.243c-6.392-3.819-12.83-8.189-19.256-13.058m38.762.048a246 246 0 0 0 8.227-6.43c-5.705.537-11.551.905-17.515 1.099a172 172 0 0 0 9.288 5.331m-52.687 6.415c-7.006 2.78-13.658 4.67-19.827 5.696c2.902 6.488 6.219 12.352 9.94 17.503c6.38-1.008 13.006-2.815 19.788-5.36c-3.636-5.026-6.962-11.004-9.901-17.839m123.4-170.16c-12.771-12.771-24.695-15.314-40.1-14.407a74 74 0 0 0-7.476.845c-6.178.999-12.567 2.761-19.1 5.237c-7.692 2.916-15.578 6.813-23.539 11.564c6.52 3.814 13.087 8.193 19.632 13.09c4.749-2.485 9.395-4.626 13.894-6.399c6.846-2.698 13.348-4.553 19.373-5.57c11.85-2 21.84-.735 28.827 3.98c4.743 7.343 6.116 17.198 4.329 28.676c6.607 2.959 12.569 6.345 17.788 10.154c.523-3.344.831-6.629.886-9.833c.248-14.29-1.74-24.564-14.513-37.336m-9.863 57.048c-1.755 4.394-3.869 8.92-6.322 13.545a172 172 0 0 1-5.623 9.789a199 199 0 0 1-6.285 9.56c-4.451 6.358-9.503 12.807-15.103 19.27a277 277 0 0 1-13.527 14.53a264 264 0 0 1-14.122 13.126c8.61-.602 16.815-1.592 24.526-2.945a199 199 0 0 0 11.266-2.314a285 285 0 0 0 12.101-13.716a255 255 0 0 0 6.698-8.45c4.921-6.501 9.334-13.018 13.178-19.484c4.603-7.74 8.386-15.406 11.252-22.892c-5.065-3.64-11.11-7.015-18.039-10.019M84.68 84.732a201 201 0 0 0-11.48 2.406a272 272 0 0 0-11.94 13.62a245 245 0 0 0-6.458 8.24c-4.846 6.467-9.186 12.957-12.974 19.401c-4.67 7.944-8.5 15.818-11.384 23.492c4.999 3.538 10.904 6.814 17.645 9.733c1.819-4.536 4.018-9.221 6.557-14.005a177 177 0 0 1 5.434-9.52a202 202 0 0 1 6.46-9.86c4.47-6.42 9.52-12.914 15.135-19.398a262.5 262.5 0 0 1 27.2-27.124c-8.473.621-16.565 1.641-24.195 3.015m152.922 5.331a74 74 0 0 0-5.55-4.444c-5.218-3.809-11.18-7.195-17.787-10.154c-7.477-3.347-15.773-6.146-24.721-8.397c1.91 7.304 3.452 15.04 4.613 23.127c5.135 1.6 9.954 3.372 14.405 5.302c6.928 3.004 12.974 6.378 18.039 10.019c9.62 6.915 15.68 14.795 17.27 22.985c-1.83 8.502-7.772 16.404-17.069 23.232c2.573 6.774 4.38 13.393 5.362 19.782c2.692-1.97 5.194-4.048 7.468-6.245c10.28-9.929 16.139-18.6 16.139-36.663s-6.634-28.292-18.17-38.544M62.449 166.898c-5.116-1.59-9.921-3.352-14.36-5.274c-6.74-2.919-12.646-6.195-17.645-9.733c-9.875-6.989-16.166-15.007-17.99-23.39c1.565-8.43 7.908-16.533 18.026-23.59c-2.45-6.542-4.215-12.937-5.236-19.107a78 78 0 0 0-5.88 4.638C7.564 100.767.766 110.757.766 128.607s5.022 24.198 13.926 33.67c3.038 3.23 6.542 6.245 10.439 9.049c5.078 3.655 10.845 6.943 17.205 9.847c7.419 3.39 15.64 6.259 24.507 8.585c-1.823-7.223-3.291-14.87-4.395-22.86m66.09-100.422a202 202 0 0 0-9.38-6.15c-6.414.199-12.695.613-18.812 1.23q-5.281.534-10.385 1.27c-8.001 1.154-15.658 2.682-22.892 4.57c-8.787 2.293-16.947 5.115-24.32 8.45c1.052 6.035 2.924 12.523 5.637 19.346c4.392-1.87 9.137-3.586 14.18-5.139a177 177 0 0 1 10.632-2.915c3.698-.89 7.528-1.695 11.481-2.406c7.63-1.374 15.722-2.394 24.196-3.015c6.233-.458 12.663-.71 19.286-.71c6.877 0 13.541.273 19.993.765c-6.556-5.681-13.125-10.786-19.615-15.296m80.077 95.425c-4.45 1.917-9.265 3.667-14.406 5.237a172 172 0 0 1-10.838 2.92a200 200 0 0 1-11.266 2.314c-7.711 1.353-15.915 2.343-24.526 2.945c-6.265.438-12.737.679-19.418.679a266 266 0 0 1-18.828-.67c6.39 5.534 12.766 10.53 19.054 14.94a199 199 0 0 0 10.036 6.597a286 286 0 0 0 17.515-1.1a255 255 0 0 0 10.728-1.234c8.076-1.11 15.804-2.589 23.097-4.434c8.858-2.24 17.07-5.022 24.482-8.338c-.988-6.158-2.866-12.826-5.63-19.856m-60.904 40.293a172 172 0 0 1-9.288-5.331a199 199 0 0 1-10.036-6.596c-6.288-4.411-12.664-9.407-19.054-14.942a278 278 0 0 1-14.568-13.56a264 264 0 0 1-13.126-14.122c.605 8.646 1.599 16.884 2.96 24.622a199 199 0 0 0 2.299 11.17a286 286 0 0 0 13.926 12.275a254 254 0 0 0 8.125 6.436c6.425 4.87 12.864 9.24 19.256 13.058c7.857 4.695 15.64 8.552 23.234 11.46c3.642-5.066 7.016-11.11 10.02-18.038c-4.458-1.781-9.053-3.933-13.748-6.432m24.53-117.354a201 201 0 0 0-2.423-11.578a271 271 0 0 0-13.413-11.766a246 246 0 0 0-8.564-6.718c-6.545-4.897-13.112-9.276-19.632-13.09c-7.826-4.576-15.582-8.338-23.144-11.181c-3.538 4.998-6.814 10.905-9.732 17.645c4.47 1.793 9.086 3.957 13.799 6.449a176 176 0 0 1 10.027 5.724c3.1 1.908 6.23 3.964 9.38 6.151c6.49 4.51 13.059 9.615 19.615 15.296a263 263 0 0 1 27.085 27.167c-.62-8.439-1.633-16.497-2.999-24.1" />
    <path fill="#57b6df" d="M196.617 118.83a172 172 0 0 0 5.623-9.788a253 253 0 0 0-6.84-8.632a271 271 0 0 1 1.217 18.42M54.646 147.62q3.135 4.202 6.548 8.382A286 286 0 0 1 60.08 138.1a177 177 0 0 0-5.434 9.52m178.268 30.394a74 74 0 0 0-.75-6.873c-.982-6.389-2.789-13.008-5.362-19.782c-2.896-7.622-6.755-15.436-11.453-23.325c-3.844 6.466-8.257 12.983-13.178 19.484c2.507 4.79 4.663 9.473 6.445 14.009c2.764 7.03 4.642 13.698 5.63 19.856c1.86 11.595.56 21.37-4.078 28.243c-7.343 4.742-17.198 6.116-28.676 4.329c-2.958 6.607-6.346 12.569-10.153 17.786c3.343.523 6.627.832 9.831.888c14.29.247 24.565-1.741 37.337-14.513s15.315-24.697 14.407-40.102M78.329 24.337c-15.644-1.041-27.514 1.215-40.137 13.838c-12.622 12.622-13.56 20.662-13.96 33.654c-.138 4.494.217 9.169 1.012 13.975c1.021 6.17 2.786 12.565 5.236 19.106c2.874 7.673 6.688 15.545 11.348 23.49c3.788-6.445 8.128-12.935 12.974-19.402c-2.483-4.714-4.636-9.332-6.415-13.806c-2.713-6.823-4.585-13.31-5.637-19.346c-2.095-12.022-.886-22.22 3.782-29.482c7.034-4.831 17.185-6.084 29.252-3.965c2.905-6.359 6.192-12.125 9.847-17.204a78 78 0 0 0-7.302-.858" />
    <path fill="#276392" d="M237.602 90.063a74 74 0 0 0-5.55-4.444c-5.218-3.809-11.18-7.195-17.787-10.154c-7.477-3.347-15.773-6.146-24.721-8.397c1.91 7.304 3.452 15.04 4.613 23.127c5.135 1.6 9.954 3.372 14.405 5.302c6.928 3.004 12.974 6.378 18.039 10.019c9.62 6.915 15.68 14.795 17.27 22.985c-1.83 8.502-7.772 16.404-17.069 23.232c2.573 6.774 4.38 13.393 5.362 19.782c2.692-1.97 5.194-4.048 7.468-6.245c10.28-9.929 16.139-18.6 16.139-36.663s-6.634-28.292-18.17-38.544M62.45 166.898c-5.117-1.59-9.922-3.352-14.36-5.274c-6.742-2.919-12.647-6.195-17.646-9.733c-9.875-6.989-16.166-15.007-17.99-23.39c1.565-8.43 7.908-16.533 18.026-23.59c-2.45-6.542-4.215-12.937-5.236-19.107a78 78 0 0 0-5.88 4.638C7.564 100.767.766 110.757.766 128.607s5.022 24.198 13.926 33.67c3.038 3.23 6.542 6.245 10.439 9.049c5.078 3.655 10.845 6.943 17.205 9.847c7.419 3.39 15.64 6.259 24.507 8.585c-1.823-7.223-3.291-14.87-4.395-22.86" />
    <path fill="#fabb66" d="M109.133 54.6a255 255 0 0 0-8.786 6.957a271 271 0 0 1 18.813-1.232a176 176 0 0 0-10.027-5.724M46.3 210.425c-4.83-7.033-6.084-17.185-3.963-29.252c-6.36-2.904-12.127-6.192-17.205-9.847c-.403 2.471-.7 4.91-.859 7.302c-1.04 15.644 1.216 27.515 13.838 40.136s20.662 13.56 33.655 13.96c4.306.133 8.777-.19 13.372-.916c-3.721-5.151-7.038-11.015-9.94-17.503c-11.767 1.954-21.753.711-28.898-3.88m62.65-8.279c-4.756 2.508-9.414 4.673-13.925 6.463c2.94 6.835 6.265 12.813 9.901 17.838c7.606-2.854 15.407-6.634 23.28-11.243c-6.392-3.819-12.83-8.189-19.256-13.058m38.762.048a246 246 0 0 0 8.227-6.43c-5.705.537-11.551.905-17.515 1.099a172 172 0 0 0 9.288 5.331" />
  </svg>
);

const GlobeIcon = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
  </svg>
);

const HelpIcon = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
    <path d="M0 0h24v24H0z" fill="none" />
    <path
      fill="currentColor"
      d="M12 2c5.523 0 10 4.478 10 10s-4.477 10-10 10S2 17.522 2 12S6.477 2 12 2m0 1.667c-4.595 0-8.333 3.738-8.333 8.333S7.405 20.333 12 20.333s8.333-3.738 8.333-8.333S16.595 3.667 12 3.667M12 15.5a1 1 0 1 1 0 2a1 1 0 0 1 0-2m0-8.75a2.75 2.75 0 0 1 2.75 2.75c0 1.01-.297 1.574-1.051 2.359l-.169.171c-.622.622-.78.886-.78 1.47a.75.75 0 0 1-1.5 0c0-1.01.297-1.574 1.051-2.359l.169-.171c.622-.622.78-.886.78-1.47a1.25 1.25 0 0 0-2.493-.128l-.007.128a.75.75 0 0 1-1.5 0A2.75 2.75 0 0 1 12 6.75"
    />
  </svg>
);

const LogoutIcon = (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-2";

function MenuItem({
  icon,
  label,
  trailing,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className={menuItemClass}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-foreground/70">{icon}</span>
      <span className="flex-1">{label}</span>
      {trailing}
    </button>
  );
}

export default function AccountMenu({
  variant,
  onOpenSettings,
  onOpenLanguage,
  onOpenSupport,
}: {
  variant: "expanded" | "collapsed";
  onOpenSettings: (tab: SettingsTab) => void;
  onOpenLanguage: () => void;
  onOpenSupport: () => void;
}) {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { canPrompt, promptInstall } = useInstallPrompt();

  // Android always gets the real signed APK, never Chrome's PWA install —
  // that path just adds a Chrome-hosted shortcut (shows "Chrome" in the app
  // switcher, no real standalone app), which reads as broken/fake to anyone
  // expecting an actual installed app. Chrome's install prompt is only used
  // where there is no APK equivalent (desktop).
  function getApp() {
    setAppsOpen(false);
    if (/android/i.test(window.navigator.userAgent)) {
      // A real <a> click (not window.open) is what makes Chrome file it under
      // its own Downloads page — so if the installed app gets deleted, the
      // APK is still there to reinstall from without coming back here.
      const a = document.createElement("a");
      a.href = CHATGIZA_APK_URL;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    if (canPrompt) promptInstall();
  }

  useEffect(() => {
    if (!menuOpen) setSwitcherOpen(false);
  }, [menuOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setSwitcherOpen(false);
        setAppsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="px-1 text-sm text-muted">···</div>;
  }

  if (!session?.user) {
    return variant === "expanded" ? (
      <Link
        href="/login"
        className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs">?</span>
        Log in
      </Link>
    ) : (
      <Link
        href="/login"
        aria-label="Log in"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-xs text-muted transition-colors hover:text-foreground"
      >
        ?
      </Link>
    );
  }

  const avatar = session.user.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={session.user.image} alt="" className={variant === "expanded" ? "h-7 w-7 rounded-full" : "h-8 w-8 rounded-full"} />
  ) : (
    <span
      className={`flex items-center justify-center rounded-full border border-border text-xs ${
        variant === "expanded" ? "h-7 w-7" : "h-8 w-8"
      }`}
    >
      {session.user.name?.[0] ?? "?"}
    </span>
  );

  function go(tab: SettingsTab) {
    onOpenSettings(tab);
    setMenuOpen(false);
  }

  return (
    // flex-1/min-w-0 only make sense for the expanded variant, which sits in
    // a horizontal footer row and needs to grow to fill it (and truncate the
    // name). In the collapsed rail this div is a plain child of a flex-col
    // aside -- flex-1 there means "grow vertically", which fought the
    // sidebar's own bottom-anchoring spacer and left the avatar stranded
    // partway up instead of flush at the bottom.
    <div className={`relative flex items-center gap-1 ${variant === "expanded" ? "min-w-0 flex-1" : ""}`} ref={ref}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className={
          variant === "expanded"
            ? "flex min-w-0 flex-1 items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
            : "flex h-8 w-8 items-center justify-center"
        }
      >
        {avatar}
        {variant === "expanded" && <span className="truncate">{session.user.name ?? session.user.email}</span>}
      </button>

      {variant === "expanded" && (
        <button
          onClick={() => setAppsOpen((v) => !v)}
          aria-label="Get ChatGiZa apps"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground ${
            appsOpen ? "bg-surface-2 text-foreground" : ""
          }`}
        >
          {AppsAlarmIcon}
        </button>
      )}

      {appsOpen && (
        <div className="absolute bottom-0 left-full z-50 ml-1 w-56 rounded-xl border border-border bg-surface p-1 shadow-lg">
          <MenuItem icon={DesktopIcon} label="Get ChatGiZa desktop" onClick={getApp} />
          <MenuItem icon={MobileIcon} label="Get ChatGiZa mobile" onClick={getApp} />
        </div>
      )}

      {menuOpen && (
        <div className="absolute bottom-full left-0 z-50 mb-1 w-72 rounded-xl border border-border bg-surface p-1 shadow-lg">
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2 ${
              switcherOpen ? "bg-surface-2" : ""
            }`}
          >
            {avatar}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {session.user.name ?? "Account"}
              </span>
              <span className="block truncate text-[10px] text-muted">{session.user.email}</span>
            </span>
            <span className="text-muted">{ChevronRightIcon}</span>
          </button>

          <div className="my-1 border-t border-border" />

          <MenuItem icon={GearIcon} label="Settings" onClick={() => go("Overview")} />
          <MenuItem
            icon={GlobeIcon}
            label="Language"
            trailing={<span className="text-muted">{ChevronRightIcon}</span>}
            onClick={() => {
              onOpenLanguage();
              setMenuOpen(false);
            }}
          />
          <MenuItem
            icon={HelpIcon}
            label="Get Help"
            trailing={<span className="text-muted">{ChevronRightIcon}</span>}
            onClick={() => {
              onOpenSupport();
              setMenuOpen(false);
            }}
          />

          <div className="my-1 border-t border-border" />

          <MenuItem
            icon={LogoutIcon}
            label="Log out"
            onClick={() => {
              setMenuOpen(false);
              chatgizaSignOut();
            }}
          />

          {switcherOpen && (
            <div className="absolute top-0 left-full z-50 ml-1 w-56 rounded-xl border border-border bg-surface p-2 shadow-lg">
              <p className="truncate px-2 py-1 text-xs text-muted">{session.user.email}</p>
              <div className="my-1 border-t border-border" />
              <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-2 py-1.5 text-sm">
                {avatar}
                <span className="flex-1 truncate">{session.user.name ?? session.user.email}</span>
                <span>{CheckIcon}</span>
              </div>
              <button
                onClick={() => signIn("google", undefined, { prompt: "select_account" })}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                + Add account
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
