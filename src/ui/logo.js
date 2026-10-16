function afmeting(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ dataUrl, breedte: img.naturalWidth, hoogte: img.naturalHeight });
        img.onerror = () => reject(new Error('Het logo kon niet worden gelezen.'));
        img.src = dataUrl;
    });
}
export function bestandNaarDataUrl(bestand) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(bestand);
    });
}
export async function logoUitBestand(bestand) {
    if (!/^image\/(png|jpeg)$/.test(bestand.type))
        throw new Error('Gebruik een PNG- of JPG-bestand als logo.');
    return afmeting(await bestandNaarDataUrl(bestand));
}
let standaard = null;
/** Logo voor het PDF: eigen logo, standaardlogo, of geen. */
export async function logoVoorPdf(inst) {
    if (inst.logo === '')
        return null;
    if (inst.logo)
        return inst.logo;
    standaard ??= fetch(`${import.meta.env.BASE_URL}logo-standaard.png`)
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('geen logo'))))
        .then(bestandNaarDataUrl)
        .then(afmeting)
        .catch(() => null);
    return standaard;
}
