"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Toaster } from "sonner";

const ROOT_PATHS = ["/", "/bugun"];
const NO_KEYBOARD = ["button", "checkbox", "color", "date", "datetime-local", "file", "hidden", "month", "radio", "range", "submit", "time", "week"];

const typingIn = (el: Element | null) =>
  el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !NO_KEYBOARD.includes(el.type));

/** What a phone needs beyond the page itself; the native parts do nothing in a browser */
export function MobileShell() {
  const { resolvedTheme } = useTheme();

  // Tab bar and action bars step aside while the on-screen keyboard is up, or the form has no room
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport || !window.matchMedia("(pointer: coarse)").matches) return;
    let fullHeight = viewport.height;
    const update = () => {
      fullHeight = Math.max(fullHeight, viewport.height);
      const open = viewport.height < fullHeight * 0.8 && typingIn(document.activeElement);
      if (open) document.documentElement.dataset.keyboard = "open";
      else delete document.documentElement.dataset.keyboard;
    };
    const rotated = () => {
      fullHeight = viewport.height;
      update();
    };
    viewport.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    window.addEventListener("orientationchange", rotated);
    return () => {
      viewport.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      window.removeEventListener("orientationchange", rotated);
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    SplashScreen.hide().catch(() => {});

    // Hardware back: an open window first, then the previous page; the home screen exits
    const listener = App.addListener("backButton", () => {
      if (document.querySelector("[role=dialog], [role=alertdialog]")) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      } else if (ROOT_PATHS.includes(window.location.pathname)) {
        App.exitApp();
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/bugun";
      }
    });
    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  // Clock and battery icons follow the theme; Style names the bar's background, not its icons
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !resolvedTheme) return;
    StatusBar.setStyle({ style: resolvedTheme === "dark" ? Style.Dark : Style.Light }).catch(() => {});
  }, [resolvedTheme]);

  return <Toaster position="top-right" richColors theme={resolvedTheme === "light" ? "light" : "dark"} offset="calc(env(safe-area-inset-top) + 16px)" />;
}
