import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

type PurchasesModule = typeof import('react-native-purchases');
type Purchases = PurchasesModule['default'];

let purchasesModule: Purchases | null | undefined;
let isConfigured = false;

async function getPurchasesModule(): Promise<Purchases | null> {
  if (purchasesModule === undefined) {
    if (Constants.appOwnership === 'expo') {
      purchasesModule = null;
    } else {
      try {
        purchasesModule = (await import('react-native-purchases')).default;
      } catch {
        purchasesModule = null;
      }
    }
  }
  return purchasesModule;
}

export async function isPurchasesAvailable(): Promise<boolean> {
  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  return !!apiKey && (await getPurchasesModule()) !== null;
}

export async function configurePurchases(appUserId: string | null): Promise<void> {
  const Purchases = await getPurchasesModule();
  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  if (!Purchases || !apiKey) return;

  try {
    if (!isConfigured) {
      Purchases.configure({ apiKey, appUserID: appUserId ?? undefined });
      isConfigured = true;
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
  const Purchases = await getPurchasesModule();
  if (!Purchases) return null;

  try {
    return await Purchases.getOfferings();
  } catch (error) {
    console.warn('Não foi possível buscar as ofertas do RevenueCat:', error);
    return null;
  }
}

export async function purchasePackage(pkg: Parameters<Purchases['purchasePackage']>[0]) {
  const Purchases = await getPurchasesModule();
  if (!Purchases) throw new Error('Compras não disponíveis nesta build.');

  return Purchases.purchasePackage(pkg);
}

export function isUserCancelledPurchase(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'userCancelled' in error &&
    (error as { userCancelled?: boolean }).userCancelled === true
  );
}

export async function restorePurchases() {
  const Purchases = await getPurchasesModule();
  if (!Purchases) return null;

  return Purchases.restorePurchases();
}

export async function manageSubscriptions() {
  const Purchases = await getPurchasesModule();
  if (!Purchases) throw new Error('Gerenciamento de assinatura não disponível nesta build.');

  const customerInfo = await Purchases.getCustomerInfo();
  if (!customerInfo.managementURL) {
    throw new Error('Não encontramos uma assinatura ativa pra gerenciar.');
  }

  await Linking.openURL(customerInfo.managementURL);
}
