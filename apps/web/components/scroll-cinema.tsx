"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * The cinematic layer. Pure enhancement: the page is complete and readable before this runs, so a
 * failure leaves content visible. Initial hidden states are set here by GSAP, never in CSS, for
 * exactly that reason.
 */
export function ScrollCinema() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Headlines rise word by word. Only below-the-fold ones: splitting a visible heading flashes.
      document.querySelectorAll<HTMLElement>("[data-words]").forEach((el) => {
        const words = (el.textContent ?? "").trim().split(/\s+/);
        el.innerHTML = words
          .map(
            (w) =>
              `<span style="display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:0.08em"><span data-word style="display:inline-block">${w}</span></span>`,
          )
          .join(" ");
        gsap.from(el.querySelectorAll("[data-word]"), {
          yPercent: 110,
          opacity: 0,
          duration: 0.9,
          ease: "power4.out",
          stagger: 0.06,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
      });

      // Figures roll over like a till.
      document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count ?? "0");
        const prefix = el.dataset.prefix ?? "";
        const suffix = el.dataset.suffix ?? "";
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.8,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onUpdate: () => {
            el.textContent = prefix + Math.round(obj.v).toLocaleString("en-US") + suffix;
          },
        });
      });

      // Cards and rows lift in as they arrive.
      document.querySelectorAll<HTMLElement>("[data-stop]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 48,
          scale: 0.97,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });

      // The timeline thread draws across, scrubbed.
      document.querySelectorAll<HTMLElement>("[data-thread-x]").forEach((el) => {
        gsap.fromTo(
          el,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            transformOrigin: "left center",
            scrollTrigger: { trigger: el.parentElement ?? el, start: "top 75%", end: "top 30%", scrub: 0.6 },
          },
        );
      });

      // The receipt assembles line by line, tied to the scroll.
      document.querySelectorAll<HTMLElement>("[data-assemble-scope]").forEach((scope) => {
        const rows = scope.querySelectorAll<HTMLElement>("[data-assemble]");
        gsap.from(rows, {
          opacity: 0,
          x: 40,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: { trigger: scope, start: "top 70%", end: "top 20%", scrub: 0.8 },
        });
      });

      // Depth: the rosette drifts against the page.
      document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
        gsap.to(el, {
          y: Number(el.dataset.parallax ?? "40"),
          rotate: 18,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
        });
      });

      // The hero medallion recedes as you leave it.
      const hero = document.querySelector<HTMLElement>("[data-hero-note]");
      if (hero && window.innerWidth >= 900) {
        gsap.to(hero, {
          scale: 0.86,
          opacity: 0.5,
          ease: "none",
          scrollTrigger: { trigger: hero, start: "top top+=60", end: "+=600", scrub: 0.8 },
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return null;
}
