"use strict";

class Verify {

    constructor() {
        this.debugging = true;
        this.apiUrl = "https://cryptotrust.trilogik.net";
        this.suspiciousDomain = this.removeSubdomain(window.location.hostname);
        this.isScammy();
    }


    isScammy() {
        this.debug("🚀 Checking for scam...");

        const request = new XMLHttpRequest();

        request.open("GET", this.apiUrl + "/status/" + this.suspiciousDomain, true);

        request.onload = () => {
            if (request.status >= 200 && request.status < 400) {
                const response = JSON.parse(request.responseText);
                this.setIcon(response.status);
                if (response.status === "scam") {
                    this.debug("🤔 Scammy site.");
                    this.checkIfAuthorized(response.status);
                } else if (response.status === "suspicious") {
                    this.debug("🤔 Suspicious site.");
                    this.checkIfAuthorized(response.status);
                }
            }
        };

        request.onerror = (err) => {
            this.debug(err);
        };

        request.send();
    }

    /**
    * Inject the pop-in in current page
    */
    async showMessage(status) {
        await this.pageLoaded();
        await this.injectCSS("css/injected.css");
        await this.injectHTML("html/injected.html", status);
        this.translate();
        this.updatePlaceholders();
        this.addListeners();
        this.addTimeOut();
    }

    async pageLoaded() {
        return new Promise((resolve) => {
            window.onload = () => {
                this.debug("Page Loaded");
                resolve(true);
            }
        });
    }

    async injectHTML(htmlpage, status) {
        return new Promise((resolve, reject) => {

            fetch(chrome.extension.getURL(htmlpage))
            .then(response => response.text())
            .then(data => {
                // Proxy div to avoid blinking on load
                const divToInject = document.createElement("div");
                divToInject.setAttribute("id", "overlaycryptofr");
                divToInject.className = status;
                divToInject.innerHTML = data;
                document.body.appendChild(divToInject);
                this.debug("HTML Injected");
                resolve(true);
            })
            .catch((err) => {
                reject("Fetch HTML " + err);
            });

        });
    }

    async injectCSS(filename) {
        return new Promise((resolve, reject) => {
            let cssFile = document.createElement("link");
            cssFile.setAttribute("rel", "stylesheet");
            cssFile.setAttribute("type", "text/css");
            cssFile.setAttribute("href", chrome.extension.getURL(filename));
            if(!document.body.appendChild(cssFile)){
                reject(new Error("appendChild CSS not possible now"));
            } else {
                cssFile.onload = () => {
                    this.debug("CSS injected");
                    resolve(true);
                }
            }
            resolve();
        });
    }

    addTimeOut() {
        setTimeout(() => {
            document.getElementById("overlaycryptofr").className += " show";
        }, 333);
    }

    updatePlaceholders() {
        document.getElementById("suscpicious-domain").innerHTML = this.suspiciousDomain;
        document.getElementById("why-btn").href = `https://cryptofr.com/search?term=${encodeURIComponent(this.suspiciousDomain)}&in=titles&categories[]=67`;
    }

    addListeners() {
        this.acceptRisks();
    }

    acceptRisks() {
        document.getElementById("i-understand-and-want-to-go-anyway").onclick = () => {
            this.addToWhiteList();
            document.getElementById("overlaycryptofr").remove();
            return false;
        };
    }

    translate() {

        // Localize by replacing __MSG_***__ meta tags / Reduce scope to our own overlay.. :)
        const objects = document.querySelectorAll("#overlaycryptofr *");
        for (let j = 0; j < objects.length; j++)
        {
            let obj     = objects[j],
                valStrH = obj.innerHTML.toString(),
                valNewH = valStrH.replace(/__MSG_(\w+)__/g, (match, v1) => {
                    return v1 ? chrome.i18n.getMessage(v1) : "";
                });

            if(valNewH !== valStrH) { obj.innerHTML = valNewH; }
        }
    }

    checkIfAuthorized(status) {
         chrome.storage.local.get(["authorized"], (results) => {
            let authorizedDomains = results.authorized;
            if(authorizedDomains.indexOf(document.domain) < 0) {
                this.showMessage(status);
            } else {
                this.debug("Domain " + document.domain + " authorized for this session.");
                return true;
            }
        });
    }


    addToWhiteList() {
        chrome.storage.local.get(["authorized"], (results) => {
            let authorizedDomains = results.authorized;
            if(authorizedDomains.indexOf(this.suspiciousDomain) < 0) {
                authorizedDomains.push(this.suspiciousDomain);
                chrome.storage.local.set({ "authorized" : authorizedDomains });
                return true;
            } else {
                return false;
            }
        });
    }


    removeSubdomain(domain) {
        domain = domain.replace(/^www\./, '');
        let parts = domain.split('.');

        while (parts.length > 3) { parts.shift(); }

        if (parts.length === 3 && ((parts[1].length > 2 && parts[2].length > 2) || (secondTLDs.indexOf(parts[1]) === -1) && firstTLDs.indexOf(parts[2]) === -1)) {
            parts.shift();
        }

        return parts.join('.');
    }

    setIcon(icon) {
        chrome.runtime.sendMessage({type: "icon-change", icon: icon});
    }

    debug(message) {
        if(this.debugging === true) {
            console.log(message);
        }
    }
}

const VF = new Verify();
