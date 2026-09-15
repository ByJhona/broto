import Purchases from 'react-native-purchases';
import { Linking, Platform } from 'react-native';
import { i18n } from '@/i18n';

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

function getApiKey(): string | undefined {
  return Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
}

export async function isPurchasesAvailable(): Promise<boolean> {
  if (!getApiKey()) return false;

  try {
    return await Purchases.isConfigured();
  } catch {
    return false;
  }
}

export async function configurePurchases(appUserId: string | null): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) return;

  try {
    if (!(await Purchases.isConfigured())) {
      Purchases.configure({ apiKey, appUserID: appUserId ?? undefined });
    } else if (appUserId) {
      await Purchases.logIn(appUserId);
    } else {
      await Purchases.logOut();
    }
  } catch (error) {
    console.warn('Não foi possível configurar o RevenueCat:', error);
  }
}

export async function getOfferings() {
  try {
    return await Purchases.getOfferings();
  } catch (error) {
    console.warn('Não foi possível buscar as ofertas do RevenueCat:', error);
    return null;
  }
}

type Offerings = Awaited<ReturnType<typeof Purchases.getOfferings>>;

export function findStorePackage(offerings: Offerings | null, productId: string) {
  return offerings?.current?.availablePackages.find(
    (item) => item.identifier === productId || item.product.identifier === productId
  );
}

export async function purchasePackage(pkg: Parameters<typeof Purchases.purchasePackage>[0]) {
  return Purchases.purchasePackage(pkg);
}

export function isUserCancelledPurchase(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}

export async function manageSubscriptions() {
  const customerInfo = await Purchases.getCustomerInfo();
  if (!customerInfo.managementURL) {
    throw new Error(i18n.t('credits:noActiveSubscription'));
  }

  await Linking.openURL(customerInfo.managementURL);
}
