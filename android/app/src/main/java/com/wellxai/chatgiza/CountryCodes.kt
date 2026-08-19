package com.wellxai.chatgiza

// Country dial codes for the Mobile number picker (Security > Mobile).
// Not exhaustive of every ISO country, but covers East Africa (where most
// of this app's users are) plus every major global market -- a country
// missing here just isn't selectable from the picker, it doesn't block
// typing a number by hand.
data class CountryDialCode(val name: String, val flag: String, val dialCode: String)

val COUNTRY_DIAL_CODES = listOf(
  CountryDialCode("Tanzania", "🇹🇿", "+255"),
  CountryDialCode("Kenya", "🇰🇪", "+254"),
  CountryDialCode("Uganda", "🇺🇬", "+256"),
  CountryDialCode("Rwanda", "🇷🇼", "+250"),
  CountryDialCode("Burundi", "🇧🇮", "+257"),
  CountryDialCode("DR Congo", "🇨🇩", "+243"),
  CountryDialCode("South Sudan", "🇸🇸", "+211"),
  CountryDialCode("Zambia", "🇿🇲", "+260"),
  CountryDialCode("Malawi", "🇲🇼", "+265"),
  CountryDialCode("Mozambique", "🇲🇿", "+258"),
  CountryDialCode("Zimbabwe", "🇿🇼", "+263"),
  CountryDialCode("Ethiopia", "🇪🇹", "+251"),
  CountryDialCode("Somalia", "🇸🇴", "+252"),
  CountryDialCode("Sudan", "🇸🇩", "+249"),
  CountryDialCode("Comoros", "🇰🇲", "+269"),
  CountryDialCode("Madagascar", "🇲🇬", "+261"),
  CountryDialCode("Mauritius", "🇲🇺", "+230"),
  CountryDialCode("Seychelles", "🇸🇨", "+248"),
  CountryDialCode("South Africa", "🇿🇦", "+27"),
  CountryDialCode("Namibia", "🇳🇦", "+264"),
  CountryDialCode("Botswana", "🇧🇼", "+267"),
  CountryDialCode("Nigeria", "🇳🇬", "+234"),
  CountryDialCode("Ghana", "🇬🇭", "+233"),
  CountryDialCode("Senegal", "🇸🇳", "+221"),
  CountryDialCode("Ivory Coast", "🇨🇮", "+225"),
  CountryDialCode("Cameroon", "🇨🇲", "+237"),
  CountryDialCode("Egypt", "🇪🇬", "+20"),
  CountryDialCode("Morocco", "🇲🇦", "+212"),
  CountryDialCode("Algeria", "🇩🇿", "+213"),
  CountryDialCode("Tunisia", "🇹🇳", "+216"),
  CountryDialCode("United States", "🇺🇸", "+1"),
  CountryDialCode("Canada", "🇨🇦", "+1"),
  CountryDialCode("United Kingdom", "🇬🇧", "+44"),
  CountryDialCode("Ireland", "🇮🇪", "+353"),
  CountryDialCode("Germany", "🇩🇪", "+49"),
  CountryDialCode("France", "🇫🇷", "+33"),
  CountryDialCode("Spain", "🇪🇸", "+34"),
  CountryDialCode("Portugal", "🇵🇹", "+351"),
  CountryDialCode("Italy", "🇮🇹", "+39"),
  CountryDialCode("Netherlands", "🇳🇱", "+31"),
  CountryDialCode("Belgium", "🇧🇪", "+32"),
  CountryDialCode("Switzerland", "🇨🇭", "+41"),
  CountryDialCode("Sweden", "🇸🇪", "+46"),
  CountryDialCode("Norway", "🇳🇴", "+47"),
  CountryDialCode("Denmark", "🇩🇰", "+45"),
  CountryDialCode("Finland", "🇫🇮", "+358"),
  CountryDialCode("Poland", "🇵🇱", "+48"),
  CountryDialCode("Greece", "🇬🇷", "+30"),
  CountryDialCode("Turkey", "🇹🇷", "+90"),
  CountryDialCode("Russia", "🇷🇺", "+7"),
  CountryDialCode("Ukraine", "🇺🇦", "+380"),
  CountryDialCode("United Arab Emirates", "🇦🇪", "+971"),
  CountryDialCode("Saudi Arabia", "🇸🇦", "+966"),
  CountryDialCode("Qatar", "🇶🇦", "+974"),
  CountryDialCode("Israel", "🇮🇱", "+972"),
  CountryDialCode("India", "🇮🇳", "+91"),
  CountryDialCode("Pakistan", "🇵🇰", "+92"),
  CountryDialCode("Bangladesh", "🇧🇩", "+880"),
  CountryDialCode("China", "🇨🇳", "+86"),
  CountryDialCode("Japan", "🇯🇵", "+81"),
  CountryDialCode("South Korea", "🇰🇷", "+82"),
  CountryDialCode("Indonesia", "🇮🇩", "+62"),
  CountryDialCode("Malaysia", "🇲🇾", "+60"),
  CountryDialCode("Singapore", "🇸🇬", "+65"),
  CountryDialCode("Philippines", "🇵🇭", "+63"),
  CountryDialCode("Thailand", "🇹🇭", "+66"),
  CountryDialCode("Vietnam", "🇻🇳", "+84"),
  CountryDialCode("Australia", "🇦🇺", "+61"),
  CountryDialCode("New Zealand", "🇳🇿", "+64"),
  CountryDialCode("Brazil", "🇧🇷", "+55"),
  CountryDialCode("Mexico", "🇲🇽", "+52"),
  CountryDialCode("Argentina", "🇦🇷", "+54")
)

val DEFAULT_COUNTRY_DIAL_CODE = COUNTRY_DIAL_CODES.first { it.name == "Tanzania" }

// Longest-prefix match against a raw number that already starts with "+"
// (e.g. pasted or typed with the code included) -- "+255" must win over a
// shorter "+2" some other country might have, so this tries longest dial
// codes first.
fun matchCountryByDialCode(rawNumber: String): CountryDialCode? {
  if (!rawNumber.startsWith("+")) return null
  return COUNTRY_DIAL_CODES
    .sortedByDescending { it.dialCode.length }
    .firstOrNull { rawNumber.startsWith(it.dialCode) }
}
