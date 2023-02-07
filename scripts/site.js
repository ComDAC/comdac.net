let pageObj;

export function registerPage(page) {
    pageObj = new page();

    window.addEventListener("load", pageLoad);
    
    if (pageObj.onResize) window.addEventListener("resize", pageObj.onResize);
    if (pageObj.onClose) window.addEventListener("close", pageObj.onClose);
}

function pageLoad() {
    if (pageObj.dom) populateDom(pageObj.dom);

    if (pageObj.onLoad) {
        const params = new URLSearchParams(window.location.search);

        pageObj.onLoad(params);
    }
}

function populateDom(dom) {
    const keys = Object.keys(dom);

    for (const key of keys) {
        dom[key] = document.getElementById(key);
    }
}