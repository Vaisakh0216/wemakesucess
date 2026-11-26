/** Pay-by-UPI-QR helpers, shared by the browser and the server. */

/** A UPI transaction reference (UTR / RRN): 12 digits. */
export const UTR = /^\d{12}$/;

/** Short reference for the UPI payment note, so a payment can be matched to a document. */
export const refFor = (rid: string) => 'WMS' + rid.replace(/-/g, '').slice(0, 8).toUpperCase();

/** A upi://pay link with the amount filled in. Every UPI app (GPay, PhonePe, Paytm, BHIM) reads it, from a QR code or a tap. */
export function upiLink(o: { id: string; name: string; rupees: number; note: string }): string {
  const q = new URLSearchParams({ pa: o.id, pn: o.name, am: o.rupees.toFixed(2), cu: 'INR', tn: o.note });
  return 'upi://pay?' + q.toString().replace(/\+/g, '%20');
}
