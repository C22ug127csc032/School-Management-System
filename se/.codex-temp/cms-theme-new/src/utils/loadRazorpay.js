const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-script';
const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let razorpayLoader;

export function loadRazorpay() {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayLoader) {
    return razorpayLoader;
  }

  razorpayLoader = new Promise(resolve => {
    const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID);

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(Boolean(window.Razorpay)), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = RAZORPAY_SCRIPT_ID;
    script.src = RAZORPAY_SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  }).finally(() => {
    if (!window.Razorpay) {
      razorpayLoader = null;
    }
  });

  return razorpayLoader;
}
