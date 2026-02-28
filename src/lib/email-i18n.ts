export type EmailLocale = "en" | "ar";

const copy: Record<
  EmailLocale,
  {
    otp: { subject: string; title: string; body: string; expiry: string };
    assignment: { subject: string; title: string; body: string };
    confirmation: {
      subject: string;
      title: string;
      body: string;
      contactTitle: string;
      phone: string;
      email: string;
      paymentNote: string;
      changeNote: string;
    };
    rejection: { subject: string; title: string; body: string };
    resultsReady: {
      subject: string;
      title: string;
      body: string;
      viewBookings: string;
      passwordLabel: string;
      passwordNote: string;
    };
  }
> = {
  en: {
    otp: {
      subject: "Your verification code – Aya Eye",
      title: "Verify your email",
      body: "Use this code to verify your email:",
      expiry: "This code expires in 10 minutes.",
    },
    assignment: {
      subject: "Booking assigned – Aya Eye",
      title: "Booking assigned",
      body: "A booking has been assigned to you.",
    },
    confirmation: {
      subject: "Booking confirmed – Aya Eye",
      title: "Booking confirmed",
      body: "Your booking has been confirmed. You can add it to your calendar using the attached file.",
      contactTitle: "Your contact",
      phone: "Phone",
      email: "Email",
      paymentNote: "Payment: No online payments. Payment will be handled offline (e.g. on the day or by bank transfer as agreed).",
      changeNote: "If you need to change or cancel, please contact us as soon as possible.",
    },
    rejection: {
      subject: "Booking update – Aya Eye",
      title: "Booking not confirmed",
      body: "Unfortunately we could not confirm your booking. If you have questions, please contact us.",
    },
    resultsReady: {
      subject: "Your photo session results are ready – Aya Eye",
      title: "Session results ready",
      body: "Your photo session results have been uploaded and are ready to view.",
      viewBookings: "View my bookings",
      passwordLabel: "Results password",
      passwordNote: "Use the password below to view your results when you open your completed booking.",
    },
  },
  ar: {
    otp: {
      subject: "رمز التحقق – Aya Eye",
      title: "تأكيد بريدك الإلكتروني",
      body: "استخدم هذا الرمز لتأكيد بريدك الإلكتروني:",
      expiry: "ينتهي صلاحية هذا الرمز خلال 10 دقائق.",
    },
    assignment: {
      subject: "تم تعيين حجز – Aya Eye",
      title: "تم تعيين الحجز",
      body: "تم تعيين حجز لك.",
    },
    confirmation: {
      subject: "تم تأكيد الحجز – Aya Eye",
      title: "تم تأكيد الحجز",
      body: "تم تأكيد حجزك. يمكنك إضافته إلى تقويمك باستخدام الملف المرفق.",
      contactTitle: "جهة الاتصال",
      phone: "الهاتف",
      email: "البريد الإلكتروني",
      paymentNote: "الدفع: لا مدفوعات إلكترونية. سيتم الدفع خارجيًا (مثلًا في اليوم أو بالتحويل البنكي كما يتفق).",
      changeNote: "إن احتجت لتعديل أو إلغاء الحجز، يرجى التواصل معنا في أقرب وقت.",
    },
    rejection: {
      subject: "تحديث الحجز – Aya Eye",
      title: "لم يتم تأكيد الحجز",
      body: "للأسف لم نتمكن من تأكيد حجزك. إن كان لديك استفسارات، يرجى التواصل معنا.",
    },
    resultsReady: {
      subject: "نتائج جلسة التصوير جاهزة – Aya Eye",
      title: "نتائج الجلسة جاهزة",
      body: "تم رفع نتائج جلسة التصوير وهي جاهزة للمشاهدة.",
      viewBookings: "عرض حجوزاتي",
      passwordLabel: "كلمة مرور النتائج",
      passwordNote: "استخدم كلمة المرور أدناه لعرض النتائج عند فتح الحجز المكتمل.",
    },
  },
};

export function getEmailCopy(locale: EmailLocale = "en") {
  const l = locale === "ar" ? "ar" : "en";
  return copy[l];
}
