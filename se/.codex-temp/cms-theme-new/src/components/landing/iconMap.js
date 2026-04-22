import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiBell,
  FiBook,
  FiBookOpen,
  FiCalendar,
  FiClipboard,
  FiClock,
  FiCoffee,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiPackage,
  FiPhone,
  FiShield,
  FiShoppingBag,
  FiTarget,
  FiTrendingUp,
  FiUser,
  FiUserPlus,
  FiUsers,
} from '../common/icons';

export const LANDING_ICON_MAP = {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiBell,
  FiBook,
  FiBookOpen,
  FiCalendar,
  FiClipboard,
  FiClock,
  FiCoffee,
  FiCreditCard,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiPackage,
  FiPhone,
  FiShield,
  FiShoppingBag,
  FiTarget,
  FiTrendingUp,
  FiUser,
  FiUserPlus,
  FiUsers,
};

export const LANDING_ICON_OPTIONS = Object.keys(LANDING_ICON_MAP).map(value => ({
  value,
  label: value.replace(/^Fi/, '').replace(/([A-Z])/g, ' $1').trim(),
}));

export const resolveLandingIcon = iconKey => LANDING_ICON_MAP[String(iconKey || '').trim()] || FiBarChart2;

export default LANDING_ICON_MAP;
