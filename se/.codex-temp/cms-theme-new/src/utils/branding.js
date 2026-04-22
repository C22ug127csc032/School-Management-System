import ematixLogo from '../../assets/Ematix-logo.png';
import ematixWordmark from '../../assets/Ematix-text-img.png';

export const EMATIX_LOGO = ematixLogo;
export const EMATIX_WORDMARK = ematixWordmark;

export const getInstitutionInitial = institution =>
  String(
    institution?.branding?.portalTitle
    || institution?.branding?.institutionName
    || institution?.name
    || 'C'
  ).trim().charAt(0).toUpperCase() || 'C';

export const isTrialBrandActive = ({ subscriptionStatus = '', institutionStatus = '' } = {}) =>
  String(subscriptionStatus || institutionStatus || '').trim().toLowerCase() === 'trialing';

export const getPortalBranding = ({
  institution = null,
  subscription = null,
  institutionStatus = '',
  platform = false,
} = {}) => {
  if (platform) {
    return {
      title: 'Ematix',
      subtitle: 'Platform Control',
      iconSrc: EMATIX_LOGO,
      logoSrc: EMATIX_WORDMARK,
      initial: 'E',
      usesEmatixBrand: true,
    };
  }

  const branding = institution?.branding || {};
  const usesEmatixBrand = isTrialBrandActive({
    subscriptionStatus: subscription?.status,
    institutionStatus: institutionStatus || institution?.status,
  });

  return {
    title: branding.portalTitle || branding.institutionName || institution?.name || 'Institution',
    subtitle: '',
    iconSrc: usesEmatixBrand ? EMATIX_LOGO : (branding.iconUrl || ''),
    logoSrc: usesEmatixBrand ? EMATIX_WORDMARK : (branding.logoUrl || ''),
    initial: getInstitutionInitial(institution),
    usesEmatixBrand,
  };
};

const ensureFaviconElement = () => {
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'icon');
    document.head.appendChild(link);
  }
  return link;
};

export const createLetterFavicon = ({
  letter = 'C',
  background = '#2D56C5',
  color = '#FFFFFF',
} = {}) => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) return '';

  context.fillStyle = background;
  context.fillRect(0, 0, 64, 64);
  context.fillStyle = color;
  context.font = 'bold 34px Segoe UI';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(letter || 'C').charAt(0).toUpperCase(), 32, 34);
  return canvas.toDataURL('image/png');
};

export const applyDocumentBranding = ({
  title = 'Ematix',
  iconSrc = '',
  initial = 'C',
  primaryColor = '#2D56C5',
} = {}) => {
  document.title = title;
  const favicon = ensureFaviconElement();
  favicon.setAttribute(
    'href',
    iconSrc || createLetterFavicon({ letter: initial, background: primaryColor })
  );
};

export default {
  applyDocumentBranding,
  createLetterFavicon,
  EMATIX_LOGO,
  EMATIX_WORDMARK,
  getInstitutionInitial,
  getPortalBranding,
  isTrialBrandActive,
};
