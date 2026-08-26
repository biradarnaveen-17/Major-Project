const currentHost = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
export const API_URL = `http://${currentHost}:5000`;
export const RPC_URL = `http://${currentHost}:8545`;
export const ADDRESSES = { base: "0x5FbDB2315678afecb367f032d93F642f64180aa3", optimized: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" };
export const DEMO_ACCOUNTS = { authority: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", buyer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", farmer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" };
export const DEFAULT_DEMO_LAND_ID = String(Date.now());
export const NAV = [["overview", "Dashboard"], ["farmer", "My land & registration"], ["agent", "Revenue officer desk"], ["registry", "Land registration"], ["transfer", "Mutation & transfer"], ["documents", "RTC & documents"], ["accounts", "Officer accounts"], ["gaslog", "Live EVM Gas Audit"], ["analytics", "Gas analysis"], ["loadtest", "Workload benchmark (10, 100, 500)"], ["audit", "Audit register"]];
export const PORTALS = {
  citizen: { label: "Citizen portal", account: "farmer", defaultView: "farmer", views: ["overview", "farmer", "transfer", "documents"] },
  farmer: { label: "Citizen portal", account: "farmer", defaultView: "farmer", views: ["overview", "farmer", "transfer", "documents"] },
  purchaser: { label: "Citizen portal", account: "buyer", defaultView: "farmer", views: ["overview", "farmer", "transfer", "documents"] },
  officer: { label: "Revenue Officer portal", account: "authority", defaultView: "agent", views: ["overview", "agent", "registry", "transfer", "documents", "gaslog"] },
  admin: { label: "System Administrator", account: "authority", defaultView: "gaslog", views: ["overview", "gaslog", "accounts", "analytics", "loadtest", "audit"] }
};
export const COMMON_ABI = ["function registerLand(uint256,address,string,string,uint256)", "function registerLand(uint256,address,bytes32,uint96)", "function requestTransfer(uint256,address)", "function approveTransfer(uint256)", "function transferOwnership(uint256)", "function registrars(address) view returns (bool)"];
export const BASE_ABI = [...COMMON_ABI, "function getLandDetails(uint256) view returns (uint256,string,string,uint256,address,address,uint8,address[])"];
export const OPTIMIZED_ABI = [...COMMON_ABI, "function getLandDetails(uint256) view returns (address,uint96,bytes32,address,uint8,address[])", "error NotRegistrar()", "error ZeroAddress()", "error InvalidArea()", "error LandNotRegistered()", "error DuplicateRegistration()", "error DuplicateParcel()", "error NotCurrentOwner()", "error InvalidNewOwner()", "error TransferAlreadyActive()", "error TransferNotRequested()", "error TransferNotApproved()", "error NotPendingOwner()"];
export const statusText = ["No transfer", "Requested", "Approved"];
export const errorText = { NotRegistrar: "Registration and approval require a registrar account.", DuplicateRegistration: "This land ID is already registered. Choose a new land ID.", DuplicateParcel: "This Survey Number and revenue location are already registered. A second blockchain land ID cannot be created for the same parcel.", InvalidArea: "Area must be greater than zero.", ZeroAddress: "An owner or buyer address is missing or invalid.", NotCurrentOwner: "Only the current owner can request a transfer.", TransferAlreadyActive: "A transfer is already active for this land ID.", TransferNotRequested: "Request the transfer before approving it.", TransferNotApproved: "Approve the transfer before the buyer accepts it.", NotPendingOwner: "Only the selected buyer can accept this transfer.", LandNotRegistered: "This land ID has not been registered." };
export const baseErrorText = [["duplicate land registration", errorText.DuplicateRegistration], ["duplicate survey and location", errorText.DuplicateParcel], ["area must be positive", errorText.InvalidArea], ["owner is zero address", errorText.ZeroAddress], ["new owner is zero address", errorText.ZeroAddress], ["new owner is current owner", "Choose a buyer who is different from the current owner."], ["caller is not owner", errorText.NotCurrentOwner], ["transfer already active", errorText.TransferAlreadyActive], ["transfer not requested", errorText.TransferNotRequested], ["transfer not approved", errorText.TransferNotApproved], ["caller is not pending owner", errorText.NotPendingOwner], ["land is not registered", errorText.LandNotRegistered], ["caller is not registrar", errorText.NotRegistrar]];
export const DEMO_KEYS = {
  authority: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  buyer: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  farmer: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
};

export const KARNATAKA_REVENUE_HIERARCHY = {
  "Bagalkote": {
    "Badami": ["Badami", "Kerur", "Kulgeri"],
    "Bagalkote": ["Bagalkote", "Kaladgi", "Sitimani"],
    "Bilagi": ["Bilagi", "Anagawadi"],
    "Hungund": ["Hungund", "Amingad", "Kardi"],
    "Jamkhandi": ["Jamkhandi", "Savalagi"],
    "Mudhol": ["Mudhol", "Lokapur"],
    "Rabkavi-Banhatti": ["Rabkavi", "Banhatti"]
  },
  "Ballari": {
    "Ballari": ["Ballari", "Kurugodu"],
    "Kampli": ["Kampli"],
    "Sandur": ["Sandur"],
    "Siruguppa": ["Siruguppa", "Kuruvalli"]
  },
  "Belagavi": {
    "Athani": ["Athani", "Kagawad", "Kokatnur"],
    "Bailhongal": ["Bailhongal", "Nesargi"],
    "Belagavi": ["Belagavi", "Kakati", "Yallur"],
    "Chikkodi": ["Chikkodi", "Ankali", "Nagaramunnoli"],
    "Gokak": ["Gokak", "Kulgod", "Konnur"],
    "Hukkeri": ["Hukkeri", "Sankeshwar", "Yamakanmardi"],
    "Khanapur": ["Khanapur", "Nandgad", "Londa"],
    "Kittur": ["Kittur", "Hire-Hattiholi"],
    "Mudalagi": ["Mudalagi", "Aragavi"],
    "Nippani": ["Nippani", "Sadalga"],
    "Raibag": ["Raibag", "Kudachi"],
    "Ramdurg": ["Ramdurg", "Mudakavi"],
    "Savadatti": ["Savadatti", "Yaragatti", "Munavalli"]
  },
  "Bengaluru Rural": {
    "Devanahalli": ["Devanahalli", "Vijayapura"],
    "Doddaballapura": ["Doddaballapura", "Sasalu"],
    "Hosakote": ["Hosakote", "Anugondanahalli", "Jadigenahalli"],
    "Nelamangala": ["Nelamangala", "Thyamagondlu"]
  },
  "Bengaluru Urban": {
    "Bengaluru North": ["Yelahanka", "Jala", "Hesaraghatta"],
    "Bengaluru East": ["Bidarahalli", "K.R. Puram", "Doddagubbi"],
    "Bengaluru South": ["Begur", "Uttarahalli", "Varthur"],
    "Anekal": ["Anekal", "Sarjapur", "Jigani"]
  },
  "Bengaluru South": {
    "Ramanagara": ["Ramanagara", "Kootagal"],
    "Channapatna": ["Channapatna", "Malur"],
    "Kanakapura": ["Kanakapura", "Sathanur", "Kodihalli"],
    "Magadi": ["Magadi", "Solur", "Thippasandra"]
  },
  "Bidar": {
    "Aurad": ["Aurad", "Santpur"],
    "Basavakalyan": ["Basavakalyan", "Narayanpur"],
    "Bhalki": ["Bhalki", "Halbarga", "Khatak Chincholi"],
    "Bidar": ["Bidar", "Chitguppa", "Markunda"],
    "Humnabad": ["Humnabad", "Hallikhed", "Dubalgundi"]
  },
  "Chamarajanagar": {
    "Chamarajanagar": ["Chamarajanagar", "Haradanahalli"],
    "Gundlupet": ["Gundlupet", "Terakanambi", "Begur"],
    "Kollegala": ["Kollegala", "Hanur", "Ramapura"],
    "Yelandur": ["Yelandur", "Agrahara"]
  },
  "Chikkaballapura": {
    "Chikkaballapura Taluk": ["Kasaba", "Peresandra", "Mandikal", "Nandi"],
    "Bagepalli Taluk": ["Bagepalli", "Gudibande"],
    "Chintamani Taluk": ["Chintamani", "Kaivara", "Murugamalla"],
    "Gauribidanur Taluk": ["Gauribidanur", "Manchenahalli", "Thondebhavi"],
    "Sidlaghatta Taluk": ["Kasaba", "Jangamakote", "Sadali"],
    "Gudibande Taluk": ["Gudibande", "Someshwarahalli"]
  },
  "Chikkamagaluru": {
    "Chikkamagaluru Taluk": ["Chikkamagaluru", "Aldur", "Mugulavalli"],
    "Kadur Taluk": ["Kadur", "Birur", "Sakharayapatna"],
    "Koppa Taluk": ["Koppa", "Hariharapura"],
    "Mudigere Taluk": ["Mudigere", "Banakal", "Gonibeedu"],
    "Narasimharajapura Taluk": ["N.R. Pura", "Balehonnur"],
    "Sringeri Taluk": ["Sringeri", "Kigga"],
    "Tarikere Taluk": ["Tarikere", "Lingadahalli"]
  },
  "Chitradurga": {
    "Chitradurga Taluk": ["Chitradurga", "Turuvanur", "H.D. Kote"],
    "Challakere Taluk": ["Challakere", "Thalak", "Naikanahatti"],
    "Hiriyur Taluk": ["Hiriyur", "Aimangala", "Dharmapura"],
    "Hosadurga Taluk": ["Hosadurga", "Srirampura", "Madadakere"],
    "Holalkere Taluk": ["Holalkere", "Ramagiri", "Chennagiri"],
    "Molakalmuru Taluk": ["Molakalmuru", "Rayapura", "Brahmadevarahalli"]
  },
  "Dakshina Kannada": {
    "Mangaluru Taluk": ["Mangaluru", "Gurupura", "Surathkal", "Mulki"],
    "Bantwal Taluk": ["Bantwal", "Panemangalore", "Vittal"],
    "Belthangady Taluk": ["Belthangady", "Kokkada", "Venoor"],
    "Puttur Taluk": ["Puttur", "Uppinangady"],
    "Sullia Taluk": ["Sullia", "Panja"],
    "Kadaba Taluk": ["Kadaba"],
    "Moodabidri Taluk": ["Moodabidri"],
    "Mulki Taluk": ["Mulki"],
    "Ullal Taluk": ["Ullal"]
  },
  "Davanagere": {
    "Davanagere Taluk": ["Davanagere", "Mayakonda", "Anagodu", "Hadadi"],
    "Harihar Taluk": ["Harihar", "Rajanahalli"],
    "Harapanahalli Taluk": ["Harapanahalli", "Teligi", "Arasikere"],
    "Honnali Taluk": ["Honnali", "Sasvehalli"],
    "Channagiri Taluk": ["Channagiri", "Santhebennur", "Tavarakere"],
    "Jagalur Taluk": ["Jagalur", "Bilichodu", "Sokke"]
  },
  "Dharwad": {
    "Dharwad Taluk": ["Dharwad", "Garag", "Hubballi"],
    "Hubballi Taluk": ["Hubballi", "Gabbur", "Kundgol Road"],
    "Kundgol Taluk": ["Kundgol", "Yaraguppi", "Saunshi"],
    "Kalghatgi Taluk": ["Kalghatgi", "Tavargera", "Dastikoppa"],
    "Navalgund Taluk": ["Navalgund", "Morab", "Shalavadi"]
  },
  "Gadag": {
    "Gadag Taluk": ["Gadag", "Hulkoti", "Lakkundi"],
    "Mundaragi Taluk": ["Mundaragi", "Dambal", "Shiratti"],
    "Nargund Taluk": ["Nargund", "Shirol"],
    "Ron Taluk": ["Ron", "Gajendragad", "Belavanaki"],
    "Shirahatti Taluk": ["Shirahatti", "Bellatti", "Magadi"],
    "Gajendragad Taluk": ["Gajendragad", "Naregal"],
    "Lakshmeshwar Taluk": ["Lakshmeshwar", "Suranagi"]
  },
  "Hassan": {
    "Hassan Taluk": ["Hassan", "Salagame", "Dudda"],
    "Alur Taluk": ["Alur", "Kesaramadu"],
    "Arkalgud Taluk": ["Arkalgud", "Konanur", "Ramanathapura"],
    "Arasikere Taluk": ["Arasikere", "Javagal", "Gandasi"],
    "Belur Taluk": ["Belur", "Banavara", "Halebidu"],
    "Channarayapatna Taluk": ["Channarayapatna", "Shravanabelagola", "Nuggehalli"],
    "Holenarasipura Taluk": ["Holenarasipura", "Halenahalli", "Hariharapura"],
    "Sakleshpur Taluk": ["Sakleshpur", "Hanbal", "Yeslur"]
  },
  "Haveri": {
    "Haveri Taluk": ["Haveri", "Guttal", "Agadi"],
    "Byadgi Taluk": ["Byadgi", "Motebennur", "Medleri"],
    "Hangal Taluk": ["Hangal", "Akki-Alur", "Adur"],
    "Hirekerur Taluk": ["Hirekerur", "Rattihalli", "Kerur"],
    "Ranebennur Taluk": ["Ranebennur", "Halageri", "Medleri"],
    "Savanur Taluk": ["Savanur", "Guttal", "Hattimattur"],
    "Shiggaon Taluk": ["Shiggaon", "Bankapur", "Tadas"]
  },
  "Kalaburagi": {
    "Kalaburagi Taluk": ["Kalaburagi", "Farhatabad", "Honnakiranagi"],
    "Aland Taluk": ["Aland", "Khajuri", "Madan Hipparga"],
    "Afzalpur Taluk": ["Afzalpur", "Mashal", "Choudapur"],
    "Chincholi Taluk": ["Chincholi", "Chandapur", "Sulepet"],
    "Chittapur Taluk": ["Chittapur", "Wadi", "Kalgi"],
    "Jewargi Taluk": ["Jewargi", "Nelogi", "Andola"],
    "Sedam Taluk": ["Sedam", "Mudhol", "Malkhed"],
    "Kamalapur Taluk": ["Kamalapur", "Mahagaon", "Madbol"],
    "Shahabad Taluk": ["Shahabad", "Itga", "Wadi"]
  },
  "Kodagu": {
    "Madikeri Taluk": ["Madikeri", "Napoklu", "Sampaje"],
    "Virajpet Taluk": ["Virajpet", "Ammathi", "Balele"],
    "Somwarpet Taluk": ["Somwarpet", "Kushalnagar", "Shanthalli"]
  },
  "Kolar": {
    "Kolar Taluk": ["Kolar", "Vemgal", "Holur"],
    "Bangarapet Taluk": ["Bangarapet", "Bethamangala", "Budikote"],
    "Malur Taluk": ["Malur", "Chikkathirupathi", "Lakshmisagara"],
    "Mulbagal Taluk": ["Mulbagal", "Nangali", "Tayalur"],
    "Srinivaspur Taluk": ["Srinivaspur", "Ronur", "Rayalpad"]
  },
  "Koppal": {
    "Koppal Taluk": ["Koppal", "Hatti", "Hitnal"],
    "Gangavathi Taluk": ["Gangavathi", "Kanakagiri", "Karatagi"],
    "Kushtagi Taluk": ["Kushtagi", "Tavargera", "Hanumasagar"],
    "Yelburga Taluk": ["Yelburga", "Kuknoor", "Hirewaddatti"],
    "Kanakagiri Taluk": ["Kanakagiri", "Marali"],
    "Karatagi Taluk": ["Karatagi", "Siddapura"]
  },
  "Mandya": {
    "Mandya Taluk": ["Mandya", "B.Hosur", "Keregodu"],
    "Maddur Taluk": ["Maddur", "Koppa", "Bharathinagar"],
    "Malavalli Taluk": ["Malavalli", "Halagur", "Kesthur"],
    "Srirangapatna Taluk": ["Srirangapatna", "Pandavapura Road"],
    "Pandavapura Taluk": ["Pandavapura", "Melukote", "Jakkanahalli"],
    "Krishnarajpet Taluk": ["K.R. Pet", "Akkihebbal", "Bookanakere"],
    "Nagamangala Taluk": ["Nagamangala", "Bellur", "Bindahalli"]
  },
  "Mysuru": {
    "Mysuru Taluk": ["Mysuru", "Jayapura", "Varuna"],
    "Hunsur Taluk": ["Hunsur", "Gurupura", "Hanagodu", "Bilikere"],
    "H.D. Kote Taluk": ["H.D. Kote", "Sargur", "Antharasanthe"],
    "Nanjangud Taluk": ["Nanjangud", "Hullahalli", "Hediyala"],
    "Periyapatna Taluk": ["Periyapatna", "Bettadapura", "Harave"],
    "T. Narasipura Taluk": ["T. Narasipura", "Suttur", "Sosale"],
    "K.R. Nagar Taluk": ["K.R. Nagar", "Hanasoge", "Saligrama"]
  },
  "Raichur": {
    "Raichur Taluk": ["Raichur", "Manvi Road", "Yeramarus"],
    "Manvi Taluk": ["Manvi", "Sirwar", "Maski"],
    "Devadurga Taluk": ["Devadurga", "Gabbur", "Arakera"],
    "Sindhanur Taluk": ["Sindhanur", "Maski", "Turvihal"],
    "Lingasugur Taluk": ["Lingasugur", "Mudgal", "Maski"],
    "Maski Taluk": ["Maski", "Balaganur"]
  },
  "Shivamogga": {
    "Shivamogga Taluk": ["Shivamogga", "Holaluru", "Ayanur", "Kumsi"],
    "Bhadravati Taluk": ["Bhadravati", "Holehonnur", "Singanamane"],
    "Hosanagara Taluk": ["Hosanagara", "Nagar", "Humcha"],
    "Sagara Taluk": ["Sagara", "Anandapuram", "Avinahalli", "Kargal"],
    "Shikaripura Taluk": ["Shikaripura", "Shiralakoppa", "Esuru"],
    "Soraba Taluk": ["Soraba", "Anavatti", "Jade"],
    "Thirthahalli Taluk": ["Thirthahalli", "Agumbe", "Mandagadde"]
  },
  "Tumakuru": {
    "Tumakuru Taluk": ["Kasaba", "Bellavi", "Hebbur", "Honnudike", "Kora", "Urdigere"],
    "Gubbi Taluk": ["Kasaba", "Chelur", "Kadaba", "Nittur", "C.S. Pura", "Hagalavadi"],
    "Kunigal Taluk": ["Kasaba", "Amruthur", "Huliyurdurga", "Yediyur", "Hutridurga", "Kodavathi"],
    "Tiptur Taluk": ["Kasaba", "Honnavalli", "Nonavinakere", "K.B. Cross"],
    "Turuvekere Taluk": ["Kasaba", "Dandinashivara", "Mayasandra", "Sampige"],
    "Chikkanayakanahalli Taluk": ["Kasaba", "Huliyar", "Handanakere", "Shettikere", "Kandikere"],
    "Madhugiri Taluk": ["Kasaba", "Badavanahalli", "Dodderi", "I.D. Halli", "Kodigenahalli", "Midigeshi"],
    "Koratagere Taluk": ["Kasaba", "Holavanahalli", "Kolala", "C.N. Durga"],
    "Pavagada Taluk": ["Kasaba", "Nidagal", "Nagalamadike", "Y.N. Hosakote"],
    "Sira Taluk": ["Kasaba", "Bukkapatna", "Gowdanagere", "Hulikunte", "Kallambella"]
  },
  "Udupi": {
    "Udupi Taluk": ["Udupi"],
    "Kapu Taluk": ["Kapu"],
    "Brahmavara Taluk": ["Brahmavara", "Kota"],
    "Kundapura Taluk": ["Kundapura", "Vandse"],
    "Byndoor Taluk": ["Byndoor"],
    "Karkala Taluk": ["Karkala"],
    "Hebri Taluk": ["Ajekar"]
  },
  "Uttara Kannada": {
    "Karwar Taluk": ["Karwar", "Kadwad", "Majali"],
    "Ankola Taluk": ["Ankola", "Hillur"],
    "Kumta Taluk": ["Kumta", "Mirjan", "Katgal"],
    "Honnavar Taluk": ["Honnavar", "Mavinkurva", "Manki"],
    "Bhatkal Taluk": ["Bhatkal", "Shirali"],
    "Sirsi Taluk": ["Sirsi", "Banavasi", "Hulekal", "Sampakhanda"],
    "Siddapur Taluk": ["Siddapur", "Bilgi"],
    "Yellapur Taluk": ["Yellapur", "Manchikeri"],
    "Mundgod Taluk": ["Mundgod", "Pala"],
    "Haliyal Taluk": ["Haliyal", "Dandeli"],
    "Joida Taluk": ["Joida", "Ramnagar"],
    "Dandeli Taluk": ["Dandeli"]
  },
  "Vijayapura": {
    "Vijayapura Taluk": ["Vijayapura", "Tikota", "Nagathan"],
    "Indi Taluk": ["Indi", "Chadchan", "Salotgi"],
    "Sindagi Taluk": ["Sindagi", "Devar Hippargi", "Moratagi"],
    "Basavana Bagewadi Taluk": ["Basavana Bagewadi", "Nidagundi", "Kolhar"],
    "Muddebihal Taluk": ["Muddebihal", "Talikoti", "Nalatawad"],
    "Babaleshwar Taluk": ["Babaleshwar"],
    "Tikota Taluk": ["Tikota"],
    "Devara Hippargi Taluk": ["Devara Hippargi"],
    "Talikoti Taluk": ["Talikoti"],
    "Chadchan Taluk": ["Chadchan"],
    "Kolhar Taluk": ["Kolhar"],
    "Nidagundi Taluk": ["Nidagundi"],
    "Almel Taluk": ["Almel"]
  },
  "Vijayanagara": {
    "Hosapete Taluk": ["Hosapete", "Kamalapura", "Mariyammanahalli"],
    "Harapanahalli Taluk": ["Harapanahalli", "Teligi", "Arasikere"],
    "Hoovina Hadagali Taluk": ["Hadagali", "Hirehadagali", "Holagundi"],
    "Hagaribommanahalli Taluk": ["Hagaribommanahalli", "Mariyammanahalli"],
    "Kudligi Taluk": ["Kudligi", "Kottur", "Hosahalli"],
    "Kotturu Taluk": ["Kotturu"]
  },
  "Yadgir": {
    "Yadgir Taluk": ["Yadgir", "Saidapur", "Gurmitkal", "Konkal"],
    "Shahapur Taluk": ["Shahapur", "Gogi", "Bheemarayanagudi"],
    "Shorapur Taluk": ["Shorapur", "Kembhavi", "Hunasagi"],
    "Gurmitkal Taluk": ["Gurmitkal"],
    "Wadagera Taluk": ["Wadagera", "Hayyal"],
    "Hunasagi Taluk": ["Hunasagi", "Kakkera"]
  }
};
