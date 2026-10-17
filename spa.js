(() => {
    "use strict";

    const pageContainer = document.getElementById("page-container");
    if (!pageContainer) {
        throw new Error("Kontainer slide tidak ditemukan.");
    }

    const slides = Array.from(pageContainer.children).filter((element) =>
        element.classList.contains("pf")
    );
    if (slides.length === 0) {
        throw new Error("Slide tidak ditemukan di dokumen.");
    }
    const slideImages = slides.map((slide) => slide.querySelector("img.bi"));
    if (slideImages.some((image) => !image?.dataset.slideImage)) {
        throw new Error("Sumber gambar tidak ditemukan untuk setiap slide.");
    }

    document.body.classList.add("harmony-spa");
    pageContainer.classList.add("harmony-slide-stage");
    pageContainer.insertAdjacentHTML(
        "beforebegin",
        `<header id="harmony-toolbar">
            <button id="harmony-close" type="button" aria-label="Tutup presentasi" title="Tutup presentasi">&times;</button>
        </header>`
    );
    document.body.insertAdjacentHTML(
        "beforeend",
        `<audio id="harmony-audio" autoplay loop preload="auto">
            <source src="Challengers%20_%20Music%20-%20League%20of%20Legends%20-%20(64%20Kbps).mp3" type="audio/mpeg">
        </audio>`
    );

    const closeButton = document.getElementById("harmony-close");
    const audio = document.getElementById("harmony-audio");
    const pageNumberToIndex = new Map(
        slides.map((slide, index) => [
            Number.parseInt(slide.dataset.pageNo, 16),
            index,
        ])
    );
    let activeIndex = 0;
    let resizeTimer;

    function loadSlideImage(index) {
        const image = slideImages[index];
        if (image && !image.hasAttribute("src")) {
            image.src = image.dataset.slideImage;
        }
    }

    function indexFromHash(hash) {
        const slideRoute = hash.match(/^#slide-(\d+)$/i);
        if (slideRoute) {
            const index = Number(slideRoute[1]) - 1;
            return index >= 0 && index < slides.length ? index : null;
        }

        const pageId = hash.match(/^#(pf[0-9a-f]+)$/i);
        if (pageId) {
            const slide = document.getElementById(pageId[1]);
            return slide ? slides.indexOf(slide) : null;
        }

        const destination = hash.match(/^#(\[.*\])$/);
        if (destination) {
            try {
                const pageNumber = JSON.parse(destination[1])[0];
                return pageNumberToIndex.get(pageNumber) ?? null;
            } catch (error) {
                if (!(error instanceof SyntaxError)) {
                    throw error;
                }
            }
        }

        return null;
    }

    function writeRoute(index, replace = false) {
        const route = `#slide-${index + 1}`;
        if (window.location.hash === route) {
            return;
        }
        const method = replace ? "replaceState" : "pushState";
        window.history[method](null, "", route);
    }

    function fitActiveSlide() {
        const viewer = window.pdf2htmlEX?.defaultViewer;
        const page = viewer?.pages?.[activeIndex];
        if (!page) {
            return;
        }

        const width = page.original_width || slides[activeIndex].offsetWidth;
        const height = page.original_height || slides[activeIndex].offsetHeight;
        if (!width || !height) {
            return;
        }

        const scale = Math.min(
            1,
            pageContainer.clientWidth / width,
            pageContainer.clientHeight / height
        );
        if (scale > 0) {
            viewer.rescale(scale, false);
            viewer.cur_page_idx = activeIndex;
            viewer.scroll_to(activeIndex);
            page.show();
        }
    }

    function showSlide(index, updateRoute = false, replaceRoute = false) {
        if (!Number.isInteger(index) || index < 0 || index >= slides.length) {
            return;
        }

        activeIndex = index;
        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle("harmony-active-slide", slideIndex === index);
        });
        loadSlideImage(index);
        loadSlideImage(index + 1);

        if (updateRoute) {
            writeRoute(index, replaceRoute);
        }

        window.requestAnimationFrame(fitActiveSlide);
    }

    document.addEventListener(
        "click",
        (event) => {
            const link = event.target.closest?.("a[href^='#pf'], a[data-dest-detail]");
            if (!link) {
                return;
            }

            let pageNumber;
            if (link.dataset.destDetail) {
                try {
                    pageNumber = JSON.parse(link.dataset.destDetail)[0];
                } catch (error) {
                    if (!(error instanceof SyntaxError)) {
                        throw error;
                    }
                }
            }
            if (pageNumber === undefined) {
                const targetId = link.getAttribute("href")?.slice(1);
                const targetSlide = targetId && document.getElementById(targetId);
                if (targetSlide) {
                    pageNumber = Number.parseInt(targetSlide.dataset.pageNo, 16);
                }
            }

            const targetIndex = pageNumberToIndex.get(pageNumber);
            if (targetIndex !== undefined) {
                showSlide(targetIndex, true);
            }
        },
        true
    );

    function syncRoute() {
        const index = indexFromHash(window.location.hash);
        if (index !== null) {
            showSlide(index);
        }
    }
    window.addEventListener("popstate", syncRoute);
    window.addEventListener("hashchange", syncRoute);

    window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(fitActiveSlide, 100);
    });

    function enterFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {});
        }
    }

    function startAudio() {
        audio.play().catch(() => {});
    }

    function closePresentation() {
        if (window.opener) {
            window.close();
            return;
        }

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
        window.close();
        if (!window.closed) {
            window.location.replace("about:blank");
        }
    }

    closeButton.addEventListener("click", closePresentation);

    document.addEventListener(
        "pointerdown",
        (event) => {
            if (event.target.closest?.("#harmony-close")) {
                return;
            }
            enterFullscreen();
            startAudio();
        },
        { once: true }
    );
    document.addEventListener(
        "keydown",
        (event) => {
            if (event.key === "Escape" || event.target.closest?.("#harmony-close")) {
                return;
            }
            enterFullscreen();
            startAudio();
        },
        { once: true }
    );

    document.addEventListener("fullscreenchange", () => {
        window.requestAnimationFrame(fitActiveSlide);
    });
    enterFullscreen();
    startAudio();

    const initialIndex = indexFromHash(window.location.hash);
    showSlide(initialIndex ?? 0, !window.location.hash, true);

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            () => window.requestAnimationFrame(fitActiveSlide),
            { once: true }
        );
    } else {
        window.requestAnimationFrame(() =>
            window.requestAnimationFrame(fitActiveSlide)
        );
    }
    window.addEventListener("load", fitActiveSlide, { once: true });
})();
