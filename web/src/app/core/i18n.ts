import { DOCUMENT } from '@angular/common';
import { Injectable, Pipe, PipeTransform, effect, inject, signal } from '@angular/core';
import { storage } from './storage';

export type Lang = 'ar' | 'en';

const en = {
  'app.name': 'Wasel',
  'app.tagline': 'Your delivery day, in order',
  'nav.route': 'Route',
  'nav.add': 'Add',
  'nav.cash': 'Cash',
  'nav.more': 'More',

  'login.signIn': 'Sign in',
  'login.register': 'Create account',
  'login.name': 'Your name',
  'login.phone': 'Mobile number',
  'login.pin': 'PIN (4–6 digits)',
  'login.submitIn': 'Sign in',
  'login.submitUp': 'Create my account',
  'login.switchToUp': 'New courier? Create an account',
  'login.switchToIn': 'Already have an account? Sign in',

  'route.title': 'Today’s route',
  'route.progress': '{done} of {total} done',
  'route.optimize': 'Sort by distance',
  'route.optimizeRoads': 'Optimise with roads',
  'route.optimized': 'Route sorted — closest first',
  'route.roadOptimized': 'Road route: {km} km · {min} min',
  'route.next': 'Next stop',
  'route.stops': 'Stops after this',
  'route.noLocation': 'Missing location ({count})',
  'route.noLocationHint': 'Ask the customer to share their location — the order joins the route once they do.',
  'route.pickups': 'To pick up ({count})',
  'route.pickedAll': 'Picked up all',
  'route.empty': 'No deliveries on your route.',
  'route.emptyHint': 'Add an order or paste one from WhatsApp.',
  'route.allDone': 'All done for today. Great work!',
  'route.gpsOff': 'Turn on location so we can sort stops from where you are.',
  'route.gpsRetry': 'Enable location',
  'route.approx': '≈ {km} km',
  'route.collect': 'Collect {amount}',
  'route.mapHidden': 'Map is off: add a Google Maps API key on the server to show it.',
  'route.showMap': 'Show map',
  'route.hideMap': 'Hide map',
  'route.refresh': 'Refresh',
  'route.you': 'You are here',

  'action.navigate': 'Navigate',
  'action.call': 'Call',
  'action.whatsapp': 'WhatsApp',
  'action.done': 'Update',
  'action.ask': 'Ask for location',
  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.delete': 'Delete',
  'action.edit': 'Edit',
  'action.close': 'Close',
  'action.share': 'Share on WhatsApp',
  'action.add': 'Add',

  'status.pending_pickup': 'To pick up',
  'status.picked_up': 'On the way',
  'status.delivered': 'Delivered',
  'status.partial': 'Partly delivered',
  'status.exchange': 'Exchange',
  'status.postponed': 'Postponed',
  'status.unreachable': 'Not reachable',
  'status.refused': 'Refused',
  'status.returned': 'Returned to shop',

  'sheet.title': 'Update order',
  'sheet.collected': 'Cash collected (JD)',
  'sheet.reason': 'Reason',
  'sheet.note': 'Note',
  'sheet.date': 'New date',
  'sheet.confirm': 'Confirm',
  'sheet.reopen': 'Back on route',

  'reason.no_answer': 'No answer',
  'reason.phone_off': 'Phone off',
  'reason.wrong_number': 'Wrong number',
  'reason.wrong_address': 'Wrong address',
  'reason.changed_mind': 'Changed mind',
  'reason.price': 'Price issue',
  'reason.not_as_expected': 'Not as expected',
  'reason.no_cash': 'No cash',
  'reason.size': 'Wrong size',
  'reason.customer_request': 'Customer asked',
  'reason.not_home': 'Not at home',

  'form.newTitle': 'New order',
  'form.editTitle': 'Edit order',
  'form.paste': 'Paste the WhatsApp message',
  'form.pastePlaceholder': 'Paste the order here — we fill in the name, phone, amount and location.',
  'form.pasteButton': 'Paste from clipboard',
  'form.read': 'Read message',
  'form.parsed': 'Filled {count} fields — check them below.',
  'form.parsedNone': 'Couldn’t read details from this message. Please fill them in.',
  'form.shop': 'Shop',
  'form.newShop': '+ New shop',
  'form.shopName': 'Shop name',
  'form.customerName': 'Customer name',
  'form.customerPhone': 'Customer mobile',
  'form.amount': 'Cash to collect (JD)',
  'form.address': 'Address / landmark',
  'form.addressPlaceholder': 'e.g. Khalda, near Safeway, 3rd floor',
  'form.location': 'Customer location',
  'form.locationSet': 'Location set',
  'form.locationNone': 'No location yet',
  'form.mapsLink': 'Paste a Google Maps link',
  'form.useLink': 'Use link',
  'form.pickOnMap': 'Pick on map',
  'form.hereNow': 'I’m at the customer now',
  'form.clearLocation': 'Remove',
  'form.askAfterSave': 'You can ask the customer for their location after saving.',
  'form.withMe': 'Parcel is already with me',
  'form.saved': 'Order saved',
  'form.askNow': 'Ask the customer for their location now?',
  'form.resolving': 'Reading link…',
  'form.mapHint': 'Drag the map so the pin sits on the customer’s door.',
  'form.confirmPin': 'Use this spot',

  'cash.title': 'Cash today',
  'cash.collected': 'Collected',
  'cash.pending': 'Still on the road',
  'cash.delivered': 'Delivered',
  'cash.failed': 'Not delivered',
  'cash.active': 'Active',
  'cash.empty': 'No orders today yet.',
  'cash.summaryTitle': 'Delivery summary — {shop} — {date}',

  'more.title': 'More',
  'more.shops': 'Shops',
  'more.addShop': 'Add shop',
  'more.shopPhone': 'Shop mobile (optional)',
  'more.language': 'Language',
  'more.account': 'Account',
  'more.signOut': 'Sign out',
  'more.noShops': 'No shops yet.',

  'share.title': 'Share your delivery location',
  'share.from': 'Your order from {shop} is on its way.',
  'share.intro': 'Tap the button so the courier can find you without calling.',
  'share.button': 'Share my location',
  'share.locating': 'Finding your location…',
  'share.adjust': 'Move the map so the pin is on your door, then confirm.',
  'share.accuracy': 'Accuracy about {m} m',
  'share.confirm': 'Confirm location',
  'share.thanks': 'Thank you! The courier has your location.',
  'share.closed': 'This delivery is already completed.',
  'share.notFound': 'This link is not valid.',
  'share.denied': 'Location permission was denied. Allow location for this site in your browser settings, or move the map to your place.',
  'share.manual': 'Pick on the map instead',
  'share.already': 'We already have your location. You can update it if it is wrong.',
  'share.privacy': 'Your location is only used for this delivery.',

  'ask.message':
    'Hello {name}, this is the courier delivering your order from {shop}. Please share your location with this link so I can reach you quickly: {link}',

  'err.network': 'No connection. Your changes were not saved — try again.',
  'err.wrong_credentials': 'Wrong mobile number or PIN.',
  'err.phone_taken': 'This number already has an account. Sign in instead.',
  'err.invalid_phone': 'Enter a Jordanian mobile number (07X XXX XXXX).',
  'err.invalid_customer_phone': 'Customer mobile must be a Jordanian number (07X XXX XXXX).',
  'err.invalid_pin': 'PIN must be 4–6 digits.',
  'err.invalid_name': 'Please enter a name.',
  'err.invalid_customerName': 'Please enter the customer’s name.',
  'err.invalid_amountFils': 'Enter a valid amount, e.g. 15 or 15.500.',
  'err.location_outside_jordan': 'This location is outside Jordan.',
  'err.no_coordinates_in_link': 'Couldn’t find a location in this link.',
  'err.not_a_maps_link': 'This is not a Google Maps link.',
  'err.routing_not_configured': 'Road routing needs a server Maps key.',
  'err.routing_failed': 'Road routing failed. The distance order is still valid.',
  'err.shop_has_orders': 'This shop still has orders.',
  'err.too_many_requests': 'Too many attempts. Wait a few minutes.',
  'err.shop_required': 'Choose or add a shop.',
  'err.unknown': 'Something went wrong. Try again.',
};

type Key = keyof typeof en;

const ar: Record<Key, string> = {
  'app.name': 'واصل',
  'app.tagline': 'يوم التوصيل… مرتّب',
  'nav.route': 'المسار',
  'nav.add': 'إضافة',
  'nav.cash': 'النقد',
  'nav.more': 'المزيد',

  'login.signIn': 'تسجيل الدخول',
  'login.register': 'حساب جديد',
  'login.name': 'اسمك',
  'login.phone': 'رقم الموبايل',
  'login.pin': 'الرمز السري (٤–٦ أرقام)',
  'login.submitIn': 'دخول',
  'login.submitUp': 'إنشاء الحساب',
  'login.switchToUp': 'مندوب جديد؟ أنشئ حساباً',
  'login.switchToIn': 'لديك حساب؟ سجّل الدخول',

  'route.title': 'مسار اليوم',
  'route.progress': 'تم {done} من {total}',
  'route.optimize': 'رتّب حسب المسافة',
  'route.optimizeRoads': 'رتّب حسب الطرق',
  'route.optimized': 'تم الترتيب — الأقرب أولاً',
  'route.roadOptimized': 'حسب الطرق: {km} كم · {min} دقيقة',
  'route.next': 'المحطة التالية',
  'route.stops': 'المحطات بعدها',
  'route.noLocation': 'بدون موقع ({count})',
  'route.noLocationHint': 'اطلب من الزبون إرسال موقعه — سيُضاف الطلب للمسار فور إرساله.',
  'route.pickups': 'للاستلام ({count})',
  'route.pickedAll': 'استلمت الكل',
  'route.empty': 'لا توجد طلبات على مسارك.',
  'route.emptyHint': 'أضف طلباً أو الصقه من واتساب.',
  'route.allDone': 'خلصت طلبات اليوم. يعطيك العافية!',
  'route.gpsOff': 'فعّل الموقع حتى نرتب المحطات من مكانك.',
  'route.gpsRetry': 'تفعيل الموقع',
  'route.approx': '≈ {km} كم',
  'route.collect': 'حصّل {amount}',
  'route.mapHidden': 'الخريطة غير مفعلة: أضف مفتاح Google Maps على الخادم.',
  'route.showMap': 'إظهار الخريطة',
  'route.hideMap': 'إخفاء الخريطة',
  'route.refresh': 'إعادة تحميل',
  'route.you': 'موقعك',

  'action.navigate': 'اذهب',
  'action.call': 'اتصال',
  'action.whatsapp': 'واتساب',
  'action.done': 'تحديث',
  'action.ask': 'اطلب الموقع',
  'action.save': 'حفظ',
  'action.cancel': 'إلغاء',
  'action.delete': 'حذف',
  'action.edit': 'تعديل',
  'action.close': 'إغلاق',
  'action.share': 'مشاركة على واتساب',
  'action.add': 'إضافة',

  'status.pending_pickup': 'للاستلام',
  'status.picked_up': 'في الطريق',
  'status.delivered': 'تم التوصيل',
  'status.partial': 'توصيل جزئي',
  'status.exchange': 'تبديل',
  'status.postponed': 'مؤجل',
  'status.unreachable': 'لا يرد',
  'status.refused': 'رفض الاستلام',
  'status.returned': 'رجع للمحل',

  'sheet.title': 'تحديث الطلب',
  'sheet.collected': 'المبلغ المحصّل (دينار)',
  'sheet.reason': 'السبب',
  'sheet.note': 'ملاحظة',
  'sheet.date': 'الموعد الجديد',
  'sheet.confirm': 'تأكيد',
  'sheet.reopen': 'إرجاع للمسار',

  'reason.no_answer': 'لا يرد',
  'reason.phone_off': 'الهاتف مغلق',
  'reason.wrong_number': 'رقم خطأ',
  'reason.wrong_address': 'عنوان خطأ',
  'reason.changed_mind': 'غيّر رأيه',
  'reason.price': 'السعر',
  'reason.not_as_expected': 'غير مطابق',
  'reason.no_cash': 'لا يوجد نقد',
  'reason.size': 'المقاس غلط',
  'reason.customer_request': 'بطلب الزبون',
  'reason.not_home': 'ليس في البيت',

  'form.newTitle': 'طلب جديد',
  'form.editTitle': 'تعديل الطلب',
  'form.paste': 'الصق رسالة الواتساب',
  'form.pastePlaceholder': 'الصق الطلب هنا — نعبّي الاسم والرقم والمبلغ والموقع تلقائياً.',
  'form.pasteButton': 'لصق من الحافظة',
  'form.read': 'اقرأ الرسالة',
  'form.parsed': 'تمت تعبئة {count} حقول — راجعها بالأسفل.',
  'form.parsedNone': 'لم نتمكن من قراءة التفاصيل. عبّئها يدوياً.',
  'form.shop': 'المحل',
  'form.newShop': '+ محل جديد',
  'form.shopName': 'اسم المحل',
  'form.customerName': 'اسم الزبون',
  'form.customerPhone': 'موبايل الزبون',
  'form.amount': 'المبلغ المطلوب (دينار)',
  'form.address': 'العنوان / أقرب معلم',
  'form.addressPlaceholder': 'مثال: خلدا، قرب سيفوي، الطابق الثالث',
  'form.location': 'موقع الزبون',
  'form.locationSet': 'تم تحديد الموقع',
  'form.locationNone': 'لا يوجد موقع بعد',
  'form.mapsLink': 'الصق رابط Google Maps',
  'form.useLink': 'استخدم الرابط',
  'form.pickOnMap': 'حدد على الخريطة',
  'form.hereNow': 'أنا عند الزبون الآن',
  'form.clearLocation': 'إزالة',
  'form.askAfterSave': 'يمكنك طلب الموقع من الزبون بعد الحفظ.',
  'form.withMe': 'الطرد معي الآن',
  'form.saved': 'تم حفظ الطلب',
  'form.askNow': 'هل تريد طلب الموقع من الزبون الآن؟',
  'form.resolving': 'جاري قراءة الرابط…',
  'form.mapHint': 'حرّك الخريطة حتى يكون الدبوس على باب الزبون.',
  'form.confirmPin': 'اعتمد هذا المكان',

  'cash.title': 'نقد اليوم',
  'cash.collected': 'المحصّل',
  'cash.pending': 'ما زال بالطريق',
  'cash.delivered': 'تم التوصيل',
  'cash.failed': 'لم يُسلّم',
  'cash.active': 'نشط',
  'cash.empty': 'لا توجد طلبات اليوم بعد.',
  'cash.summaryTitle': 'ملخص التوصيل — {shop} — {date}',

  'more.title': 'المزيد',
  'more.shops': 'المحلات',
  'more.addShop': 'إضافة محل',
  'more.shopPhone': 'موبايل المحل (اختياري)',
  'more.language': 'اللغة',
  'more.account': 'الحساب',
  'more.signOut': 'تسجيل الخروج',
  'more.noShops': 'لا توجد محلات بعد.',

  'share.title': 'شارك موقع التوصيل',
  'share.from': 'طلبك من {shop} في الطريق إليك.',
  'share.intro': 'اضغط الزر ليصل المندوب إليك بدون اتصالات.',
  'share.button': 'أرسل موقعي',
  'share.locating': 'جاري تحديد موقعك…',
  'share.adjust': 'حرّك الخريطة حتى يكون الدبوس على بابك، ثم أكّد.',
  'share.accuracy': 'الدقة حوالي {m} م',
  'share.confirm': 'تأكيد الموقع',
  'share.thanks': 'شكراً! وصل موقعك للمندوب.',
  'share.closed': 'تم إغلاق هذا الطلب.',
  'share.notFound': 'هذا الرابط غير صالح.',
  'share.denied': 'تم رفض إذن الموقع. اسمح بالموقع لهذا الموقع من إعدادات المتصفح، أو حرّك الخريطة لمكانك.',
  'share.manual': 'حدد على الخريطة بدلاً من ذلك',
  'share.already': 'لدينا موقعك مسبقاً. يمكنك تحديثه إذا كان خطأ.',
  'share.privacy': 'يُستخدم موقعك لهذا التوصيل فقط.',

  'ask.message':
    'مرحباً {name}، معك مندوب التوصيل لطلبك من {shop}. لو سمحت أرسل موقعك من خلال هذا الرابط حتى أوصلك بسرعة: {link}',

  'err.network': 'لا يوجد اتصال. لم يتم الحفظ — حاول مرة أخرى.',
  'err.wrong_credentials': 'رقم الموبايل أو الرمز غير صحيح.',
  'err.phone_taken': 'هذا الرقم لديه حساب. سجّل الدخول.',
  'err.invalid_phone': 'أدخل رقم موبايل أردني (07X XXX XXXX).',
  'err.invalid_customer_phone': 'موبايل الزبون يجب أن يكون رقماً أردنياً (07X XXX XXXX).',
  'err.invalid_pin': 'الرمز يجب أن يكون من ٤ إلى ٦ أرقام.',
  'err.invalid_name': 'أدخل الاسم.',
  'err.invalid_customerName': 'أدخل اسم الزبون.',
  'err.invalid_amountFils': 'أدخل مبلغاً صحيحاً، مثل 15 أو 15.500.',
  'err.location_outside_jordan': 'هذا الموقع خارج الأردن.',
  'err.no_coordinates_in_link': 'لم نجد موقعاً في هذا الرابط.',
  'err.not_a_maps_link': 'هذا ليس رابط Google Maps.',
  'err.routing_not_configured': 'الترتيب حسب الطرق يحتاج مفتاح خرائط على الخادم.',
  'err.routing_failed': 'فشل الترتيب حسب الطرق. ترتيب المسافة ما زال صالحاً.',
  'err.shop_has_orders': 'هذا المحل لديه طلبات.',
  'err.too_many_requests': 'محاولات كثيرة. انتظر بضع دقائق.',
  'err.shop_required': 'اختر محلاً أو أضف محلاً جديداً.',
  'err.unknown': 'حدث خطأ. حاول مرة أخرى.',
};

const dictionaries: Record<Lang, Record<Key, string>> = { en, ar };

@Injectable({ providedIn: 'root' })
export class I18n {
  private doc = inject(DOCUMENT);
  readonly lang = signal<Lang>(storage.get<Lang>('wasel.lang', 'ar'));

  constructor() {
    effect(() => {
      const lang = this.lang();
      this.doc.documentElement.lang = lang;
      this.doc.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      storage.set('wasel.lang', lang);
    });
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.tIn(this.lang(), key, params);
  }

  /** Translate into a fixed language (messages to Jordanian customers are always Arabic). */
  tIn(lang: Lang, key: string, params?: Record<string, string | number>): string {
    const dict = dictionaries[lang] as Record<string, string>;
    let text = dict[key] ?? (en as Record<string, string>)[key] ?? key;
    if (params) for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  }

  /** Translates an API error code, falling back to a generic message. */
  error(code: string): string {
    const key = `err.${code}`;
    return key in en ? this.t(key) : this.t('err.unknown');
  }
}

/** `{{ 'route.title' | t }}` — impure so it re-renders when the language signal changes. */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18n);
  transform(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
