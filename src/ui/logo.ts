import type { Logo } from '../pdf/rapport';
import type { Instellingen } from '../data/opslag';

function afmeting(dataUrl: string): Promise<Logo> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ dataUrl, breedte: img.naturalWidth, hoogte: img.naturalHeight });
    img.onerror = () => reject(new Error('Het logo kon niet worden gelezen.'));
    img.src = dataUrl;
  });
}

export function bestandNaarDataUrl(bestand: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(bestand);
  });
}

export async function logoUitBestand(bestand: File): Promise<Logo> {
  if (!/^image\/(png|jpeg)$/.test(bestand.type)) throw new Error('Gebruik een PNG- of JPG-bestand als logo.');
  return afmeting(await bestandNaarDataUrl(bestand));
}

let standaard: Promise<Logo | null> | null = null;

/** Logo voor het PDF: eigen logo, standaardlogo, of geen. */
export async function logoVoorPdf(inst: Instellingen): Promise<Logo | null> {
  if (inst.logo === '') return null;
  if (inst.logo) return inst.logo;
  standaard ??= fetch(`${import.meta.env.BASE_URL}logo-standaard.png`)
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('geen logo'))))
    .then(bestandNaarDataUrl)
    .then(afmeting)
    .catch(() => null);
  return standaard;
}
