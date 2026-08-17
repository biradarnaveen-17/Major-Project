const currentHost = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
export const API_URL = `http://${currentHost}:5000`;
export const RPC_URL = `http://${currentHost}:8545`;
export const ADDRESSES = { base: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE", optimized: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed" };
export const DEMO_ACCOUNTS = { authority: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", buyer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", farmer: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" };
export const DEFAULT_DEMO_LAND_ID = String(Date.now());
export const NAV = [["overview", "Dashboard"], ["farmer", "My land & registration"], ["agent", "Revenue officer desk"], ["registry", "Land registration"], ["transfer", "Mutation & transfer"], ["documents", "RTC & documents"], ["accounts", "Officer accounts"], ["analytics", "Gas analysis"], ["loadtest", "Workload benchmark (10, 100, 500)"], ["audit", "Audit register"]];
export const PORTALS = {
  citizen: { label: "Citizen portal", account: "farmer", defaultView: "farmer", views: ["overview", "farmer", "transfer", "documents"] },
  farmer: { label: "Citizen portal", account: "farmer", defaultView: "farmer", views: ["overview", "farmer", "transfer", "documents"] },
  purchaser: { label: "Citizen portal", account: "buyer", defaultView: "farmer", views: ["overview", "farmer", "transfer", "documents"] },
  officer: { label: "Revenue Officer portal", account: "authority", defaultView: "agent", views: ["overview", "agent", "registry", "transfer", "documents"] },
  admin: { label: "System Administrator", account: "authority", defaultView: "analytics", views: ["overview", "accounts", "analytics", "loadtest", "audit"] }
};
export const COMMON_ABI = ["function registerLand(uint256,address,string,string,uint256)", "function registerLand(uint256,address,bytes32,uint96)", "function requestTransfer(uint256,address)", "function approveTransfer(uint256)", "function transferOwnership(uint256)", "function registrars(address) view returns (bool)"];
export const BASE_ABI = [...COMMON_ABI, "function getLandDetails(uint256) returns (uint256,string,string,uint256,address,address,uint8,address[])"];
export const OPTIMIZED_ABI = [...COMMON_ABI, "function getLandDetails(uint256) returns (address,uint96,bytes32,address,uint8,address[])", "error NotRegistrar()", "error ZeroAddress()", "error InvalidArea()", "error LandNotRegistered()", "error DuplicateRegistration()", "error DuplicateParcel()", "error NotCurrentOwner()", "error InvalidNewOwner()", "error TransferAlreadyActive()", "error TransferNotRequested()", "error TransferNotApproved()", "error NotPendingOwner()"];
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
    "Bagalkote Taluk": {
      "Kasaba Bagalkote": ["Bagalkote Town", "Muirhead Road", "Simikeri"],
      "Kaladgi": ["Kaladgi Village", "Khajjidoni"]
    },
    "Badami": {
      "Kasaba Badami": ["Badami Town", "Pattadakal", "Aihole"],
      "Kerur": ["Kerur Town", "Guledgudda Road"]
    },
    "Jamkhandi": {
      "Kasaba Jamkhandi": ["Jamkhandi Town", "Savalgi"],
      "Terdal": ["Terdal Town", "Rabkavi"]
    },
    "Mudhol": {
      "Kasaba Mudhol": ["Mudhol Town", "Lokapur"],
      "Lokapur": ["Lokapur Town", "Machaknur"]
    }
  },
  "Ballari": {
    "Ballari Taluk": {
      "Kasaba Ballari": ["Ballari City", "Cowl Bazaar", "Moka"],
      "Kurugodu": ["Kurugodu Town", "Kudatini"]
    },
    "Siruguppa": {
      "Kasaba Siruguppa": ["Siruguppa Town", "Tekkalakote"],
      "Hatcholli": ["Hatcholli Village", "Raravi"]
    },
    "Sandur": {
      "Kasaba Sandur": ["Sandur Town", "Toranagallu"],
      "Kudligi Road": ["Yeshwantnagar", "Donimalai"]
    }
  },
  "Belagavi": {
    "Belagavi Taluk": {
      "Kasaba Belagavi": ["Belagavi City", "Peeranwadi", "Machhe"],
      "Kakati": ["Kakati Village", "Bhopal", "Honaga"]
    },
    "Gokak": {
      "Kasaba Gokak": ["Gokak Town", "Koujalgi"],
      "Arabhavi": ["Arabhavi Village", "Ankalgi", "Mudalgi"]
    },
    "Chikkodi": {
      "Kasaba Chikkodi": ["Chikkodi Town", "Nipani"],
      "Sadalga": ["Sadalga Town", "Koganolli", "Kabbur"]
    },
    "Bailhongal": {
      "Kasaba Bailhongal": ["Bailhongal Town", "Nesaragi"],
      "Kittur": ["Kittur Fort Town", "Tigadi"]
    }
  },
  "Bengaluru Rural": {
    "Devanahalli": {
      "Kasaba Devanahalli": ["Devanahalli Town", "Binnamangala", "Vijayapura"],
      "Kundana": ["Kundana Village", "Koira", "Viswanathapura"],
      "Channarayapatna": ["Budigere", "Channarayapatna Town"]
    },
    "Doddaballapura": {
      "Kasaba Doddaballapura": ["Doddaballapura Town", "Tubagere"],
      "Tubagere": ["Ghati Subramanya", "Doddabelavangala"],
      "Sasalu": ["Sasalu Village", "Kadanur"]
    },
    "Hoskote": {
      "Kasaba Hoskote": ["Hoskote Town", "Sulibele"],
      "Anugondanahalli": ["Anugondanahalli Village", "Jadigenahalli"],
      "Nandagudi": ["Nandagudi Town", "Dunnasandra"]
    },
    "Nelamangala": {
      "Kasaba Nelamangala": ["Nelamangala Town", "T Begur"],
      "Tyamagondlu": ["Tyamagondlu Town", "Dobbaspet"],
      "Sompura": ["Sompura Industrial Area", "Dabaspete"]
    }
  },
  "Bengaluru Urban": {
    "Bengaluru North": {
      "Yelahanka": ["Jakkur", "Attur", "Kogilu", "Thanisandra", "Agrahara"],
      "Hesaraghatta": ["Chikkabanavara", "Hesaraghatta Village", "Dasarahalli", "Byatha"],
      "Kasaba North": ["Hebbal", "Nagavara", "RT Nagar", "Sanjay Nagar"]
    },
    "Bengaluru South": {
      "Begur": ["HSR Layout", "Begur Village", "Singasandra", "Bommanahalli"],
      "Kengeri": ["Kumbalgodu", "Kengeri Satellite Town", "Vajarahalli"],
      "Tavarekere": ["Chikka Gollarahatti", "Tavarekere Village"]
    },
    "Bengaluru East": {
      "KR Puram": ["Hoodi", "Mahadevapura", "KR Puram Village", "Varthur"],
      "Bidarahalli": ["Mandur", "Kannamangala", "Avalahalli"],
      "Varthur": ["Gunjur", "Panathur", "Bhoganhalli"]
    },
    "Anekal": {
      "Attibele": ["Attibele Town", "Sarjapura", "Chandapura"],
      "Jigani": ["Jigani Industrial Area", "Bannerghatta", "Haragadde"],
      "Kasaba Anekal": ["Anekal Town", "Marsur"]
    }
  },
  "Bidar": {
    "Bidar Taluk": {
      "Kasaba Bidar": ["Bidar City", "Janwada", "Manhalli"],
      "Bagdal": ["Bagdal Village", "Kamthana"]
    },
    "Basavakalyan": {
      "Kasaba Basavakalyan": ["Basavakalyan Town", "Tripuranth"],
      "Humnabad Road": ["Rajeshwar", "Mudbi"]
    },
    "Bhalki": {
      "Kasaba Bhalki": ["Bhalki Town", "Khatak Chincholi"],
      "Lanjwada": ["Lanjwada Village", "Meekar"]
    },
    "Humnabad": {
      "Kasaba Humnabad": ["Humnabad Town", "Dubalgundi"],
      "Hallikhed": ["Hallikhed B", "Chitguppa"]
    }
  },
  "Chamarajanagara": {
    "Chamarajanagara Taluk": {
      "Kasaba Chamarajanagara": ["Chamarajanagara Town", "Ramasamudra"],
      "Harave": ["Harave Village", "Kuderu"],
      "Santhemarahalli": ["Santhemarahalli Town", "Ummathur"]
    },
    "Gundlupete": {
      "Kasaba Gundlupete": ["Gundlupete Town", "Hangala"],
      "Begur Chamarajanagar": ["Begur Village", "Terakanambi"]
    },
    "Kollegala": {
      "Kasaba Kollegala": ["Kollegala Town", "Hanur"],
      "Hanur": ["Hanur Town", "Male Mahadeshwara Betta"]
    }
  },
  "Chikkaballapura": {
    "Chikkaballapura Taluk": {
      "Kasaba Chikkaballapura": ["Chikkaballapura Town", "Nandi Hills", "Agalagur"],
      "Nandi": ["Nandi Village", "Muddenahalli", "Sultanpet"],
      "Mandikal": ["Mandikal Village", "Dibbur"]
    },
    "Gauribidanur": {
      "Kasaba Gauribidanur": ["Gauribidanur Town", "Thondebhavi"],
      "Manchenahalli": ["Manchenahalli Town", "D Pura"]
    },
    "Sidlaghatta": {
      "Kasaba Sidlaghatta": ["Sidlaghatta Town", "Jangamakote"],
      "Basettihalli": ["Basettihalli Village", "Dibburhalli"]
    },
    "Chintamani": {
      "Kasaba Chintamani": ["Chintamani Town", "Kaiwara"],
      "Ambajidurga": ["Kaiwara Temple Area", "Ganjigunte"]
    }
  },
  "Chikkamagaluru": {
    "Chikkamagaluru Taluk": {
      "Kasaba Chikkamagaluru": ["Chikkamagaluru Town", "Kaimara", "Mullayanagiri"],
      "Vastare": ["Vastare Village", "Aldur"],
      "Aldur": ["Aldur Town", "Balehonnur Road"]
    },
    "Kadur": {
      "Kasaba Kadur": ["Kadur Town", "Birur"],
      "Birur": ["Birur Town", "Singatagere"]
    },
    "Tarikere": {
      "Kasaba Tarikere": ["Tarikere Town", "Ajjampura"],
      "Lakkavalli": ["Bhadra Reservoir", "Lakkavalli Town"]
    },
    "Mudigere": {
      "Kasaba Mudigere": ["Mudigere Town", "Kottigehara"],
      "Gonibeedu": ["Gonibeedu Village", "Kalasa Road"]
    }
  },
  "Chitradurga": {
    "Chitradurga Taluk": {
      "Kasaba Chitradurga": ["Chitradurga Fort City", "Aimangala"],
      "Bharamasagara": ["Bharamasagara Town", "Sirigere"],
      "Turvanur": ["Turvanur Village", "Chitradurga Rural"]
    },
    "Challakere": {
      "Kasaba Challakere": ["Challakere Town", "Nayakanahatti"],
      "Parasurampura": ["Parasurampura Village", "Talaku"]
    },
    "Hiriyur": {
      "Kasaba Hiriyur": ["Hiriyur Town", "Vani Vilasa Sagara"],
      "Dharmapura": ["Dharmapura Village", "Aimangala Road"]
    }
  },
  "Dakshina Kannada": {
    "Mangaluru": {
      "Mangaluru Hobli": ["Surathkal", "Panambur", "Kavoor", "Kodialbail"],
      "Gurupura": ["Gurupura Village", "Ganjimutt", "Bajpe"],
      "Moodabidri": ["Moodabidri Town", "Ganjeemutt"]
    },
    "Bantwal": {
      "Bantwal Hobli": ["Bantwal Town", "BC Road", "Panemangalore"],
      "Vittal": ["Vittal Town", "Kalladka", "Mani"]
    },
    "Puttur": {
      "Kasaba Puttur": ["Puttur Town", "Kumbra"],
      "Uppinangady": ["Uppinangady Town", "Nelyadi"]
    },
    "Belthangady": {
      "Kasaba Belthangady": ["Belthangady Town", "Ujire", "Dharmasthala"],
      "Kokkada": ["Kokkada Village", "Madanthyar"]
    }
  },
  "Davanagere": {
    "Davanagere Taluk": {
      "Kasaba Davanagere": ["Davanagere City", "Vidyanagar", "Hadadi"],
      "Mayakonda": ["Mayakonda Town", "Anagodu"],
      "Anagodu": ["Anagodu Village", "Bada"]
    },
    "Harihara": {
      "Kasaba Harihara": ["Harihara Town", "Malebennur"],
      "Malebennur": ["Malebennur Town", "Konnur"]
    },
    "Honnali": {
      "Kasaba Honnali": ["Honnali Town", "Nyamathi"],
      "Nyamathi": ["Nyamathi Town", "Govinakovi"]
    }
  },
  "Dharwad": {
    "Dharwad Taluk": {
      "Kasaba Dharwad": ["Dharwad City", "Sattur", "Nawalur"],
      "Garag": ["Garag Village", "Mummigatti"],
      "Alnavar": ["Alnavar Town", "Tegur"]
    },
    "Hubballi": {
      "Hubballi City": ["Hubballi City", "Vidyanagar Hubli", "Gokul Road"],
      "Hubballi Rural": ["Chabbi", "Ingali", "Unkal"]
    },
    "Navalgund": {
      "Kasaba Navalgund": ["Navalgund Town", "Annigeri"],
      "Annigeri": ["Annigeri Town", "Shalavadi"]
    }
  },
  "Gadag": {
    "Gadag Taluk": {
      "Kasaba Gadag": ["Gadag Betageri", "Mulagund", "Kanaginahal"],
      "Mulagund": ["Mulagund Town", "Hulkoti"]
    },
    "Ron": {
      "Kasaba Ron": ["Ron Town", "Gajendragad"],
      "Gajendragad": ["Gajendragad Fort Town", "Naregal"]
    },
    "Shirahatti": {
      "Kasaba Shirahatti": ["Shirahatti Town", "Laxmeshwar"],
      "Laxmeshwar": ["Laxmeshwar Town", "Magadi"]
    }
  },
  "Hassan": {
    "Hassan Taluk": {
      "Kasaba Hassan": ["Hassan Town", "Shanthigrama", "Gorur"],
      "Salagame": ["Salagame Village", "Kattaya", "Dudda Hassan"]
    },
    "Channarayapatna": {
      "Kasaba Channarayapatna": ["Channarayapatna Town", "Nuggehalli"],
      "Shravanabelagola": ["Shravanabelagola Town", "Hirisave", "Bリスave"]
    },
    "Sakleshpur": {
      "Kasaba Sakleshpur": ["Sakleshpur Town", "Yeslur"],
      "Hettur": ["Hettur Village", "Donigal"]
    },
    "Arsikere": {
      "Kasaba Arsikere": ["Arsikere Town", "Banasavandra"],
      "Javagal": ["Javagal Town", "Kanakatte"]
    }
  },
  "Haveri": {
    "Haveri Taluk": {
      "Kasaba Haveri": ["Haveri Town", "Guttal", "Karajgi"],
      "Guttal": ["Guttal Town", "Devihosur"]
    },
    "Ranebennur": {
      "Kasaba Ranebennur": ["Ranebennur Town", "Halageri"],
      "KUPPELUR": ["Kuppelur Village", "Medleri"]
    },
    "Byadgi": {
      "Kasaba Byadgi": ["Byadgi Chilli Town", "Kaginelli"],
      "Kaginelli": ["Kaginelli Kanakadasa Birthplace", "Motebennur"]
    }
  },
  "Kalaburagi": {
    "Kalaburagi Taluk": {
      "Kasaba Kalaburagi": ["Kalaburagi City", "Farhatabad", "Gulbarga University Area"],
      "Farhatabad": ["Farhatabad Village", "Kotnoor", "Pattan"]
    },
    "Sedam": {
      "Kasaba Sedam": ["Sedam Town", "Malkhed"],
      "Malkhed": ["Malkhed Fort", "Mudhol Sedam", "Kollur Sedam"]
    },
    "Aland": {
      "Kasaba Aland": ["Aland Town", "Nimbal"],
      "Khajuri": ["Khajuri Village", "Narona"]
    },
    "Chittapur": {
      "Kasaba Chittapur": ["Chittapur Town", "Shahabad"],
      "Shahabad": ["Shahabad Stone Town", "Wadi Junction"]
    }
  },
  "Kodagu": {
    "Madikeri": {
      "Kasaba Madikeri": ["Madikeri Town", "Abbey Falls Area", "Bhagamandala"],
      "Bhagamandala": ["Bhagamandala Temple Town", "Talakaveri", "Napoklu"],
      "Sampaje": ["Sampaje Ghat", "Cherambane"]
    },
    "Somwarpet": {
      "Kasaba Somwarpet": ["Somwarpet Town", "Shanivarsanthe"],
      "Kushalnagar": ["Kushalnagar Town", "Suntikoppa", "Bylakuppe Tibetan Camp"]
    },
    "Virajpet": {
      "Kasaba Virajpet": ["Virajpet Town", "Gonikoppal"],
      "Ponnampet": ["Ponnampet College Town", "Hudikeri", "Brimbal"]
    }
  },
  "Kolar": {
    "Kolar Taluk": {
      "Kasaba Kolar": ["Kolar Gold Fields Road Town", "Vokkaleri", "Sugatur"],
      "Vegaluru": ["Vegaluru Village", "Narasapura Industrial Area"]
    },
    "Bangarapet": {
      "Kasaba Bangarapet": ["Bangarapet Town", "KGF Champion Reefs"],
      "KGF": ["Oorgaum", "Marikuppam", "Robertsonpet"]
    },
    "Malur": {
      "Kasaba Malur": ["Malur Town", "Lakkur"],
      "Masti": ["Masti Village", "Tekal"]
    },
    "Mulbagal": {
      "Kasaba Mulbagal": ["Mulbagal Town", "Avani"],
      "Nangali": ["Nangali Border Town", "Tayalur"]
    }
  },
  "Koppal": {
    "Koppal Taluk": {
      "Kasaba Koppal": ["Koppal Fort Town", "Hitnal", "Alavandi"],
      "Munirabad": ["Tungabhadra Dam Munirabad", "Ginigera"]
    },
    "Gangavathi": {
      "Kasaba Gangavathi": ["Gangavathi Rice Bowl City", "Anegundi"],
      "Anegundi": ["Hampi North Anegundi", "Kishkindha", "Karatagi"]
    },
    "Yelbarga": {
      "Kasaba Yelbarga": ["Yelbarga Town", "Kuknoor"],
      "Kuknoor": ["Kuknoor Mahadeva Temple Town", "Bhanapur"]
    }
  },
  "Mandya": {
    "Mandya Taluk": {
      "Kasaba Mandya": ["Mandya Sugar City", "Kothathi", "Induvalu"],
      "Dudda": ["Dudda Village", "Basaralu", "Keragodu"]
    },
    "Srirangapatna": {
      "Kasaba Srirangapatna": ["Srirangapatna Island Fort", "Palandi"],
      "KRS": ["KRS Brindavan Gardens Area", "Ganjam Tipu Fort"]
    },
    "Maddur": {
      "Kasaba Maddur": ["Maddur Tender Coconut City", "Besagarahalli"],
      "Koppa Maddur": ["Koppa Village", "C A Kere"]
    },
    "Malavalli": {
      "Kasaba Malavalli": ["Malavalli Town", "Shivanasamudra Falls"],
      "Halagur": ["Halagur Town", "Belakavadi"]
    }
  },
  "Mysuru": {
    "Mysuru Taluk": {
      "Kasaba Mysuru": ["Nanjangud Road", "Hebbal Mysuru", "Hootagalli", "Vijayanagar Mysuru"],
      "Varuna": ["Varuna Village", "Jayapura", "Yelwal", "Chamundi Hill Foot"],
      "Jayapura": ["Udbur", "Kadakola", "Srirampura"]
    },
    "Nanjangud": {
      "Kasaba Nanjangud": ["Nanjangud Temple Town", "Hullahalli"],
      "Hullahalli": ["Hullahalli Village", "Kowlande", "Hedathale"]
    },
    "Hunsur": {
      "Kasaba Hunsur": ["Hunsur Town", "Gaviranga"],
      "Bilikere": ["Bilikere Village", "Hanagod", "K R Nagar Road"]
    },
    "T Narasipura": {
      "Kasaba T Narasipura": ["T Narasipura Triveni Sangama", "Bannur"],
      "Bannur": ["Bannur Town", "Sosale", "Mugur"]
    }
  },
  "Raichur": {
    "Raichur Taluk": {
      "Kasaba Raichur": ["Raichur Thermal Power City", "Yermaras", "Guntakal Road"],
      "Gilleshugur": ["Gilleshugur Village", "Yeddaldoddi"]
    },
    "Manvi": {
      "Kasaba Manvi": ["Manvi Town", "Sirwar"],
      "Sirwar": ["Sirwar Town", "Kurdi"]
    },
    "Sindhanur": {
      "Kasaba Sindhanur": ["Sindhanur Commercial City", "Turvihal"],
      "Turvihal": ["Turvihal Town", "Gorebal"]
    },
    "Devadurga": {
      "Kasaba Devadurga": ["Devadurga Town", "Arakera"],
      "Jaladurga": ["Jaladurga Water Fort", "Gabbur"]
    }
  },
  "Ramanagara": {
    "Ramanagara Taluk": {
      "Kasaba Ramanagara": ["Ramanagara Silk City", "Bidadi", "Kailancha"],
      "Bidadi": ["Bidadi Industrial Smart City", "Hejjala", "Wonderla Area"],
      "Kailancha": ["Kailancha Village", "Jalagangothri"]
    },
    "Channapatna": {
      "Kasaba Channapatna": ["Channapatna Toy City", "Makhali"],
      "Akkur": ["Akkur Village", "Kengal Anjaneya Temple Area"]
    },
    "Kanakapura": {
      "Kasaba Kanakapura": ["Kanakapura Town", "Harohalli"],
      "Harohalli": ["Harohalli Industrial Area", "Maralavadi", "Sangama Mekedatu"]
    },
    "Magadi": {
      "Kasaba Magadi": ["Magadi Kempegowda Fort Town", "Thippagondanahalli"],
      "Tavarekere Magadi": ["Tavarekere Village", "Kudur"]
    }
  },
  "Shivamogga": {
    "Shivamogga Taluk": {
      "Kasaba Shivamogga": ["Shivamogga City", "Holehonnur", "Vidyanagar Shivamogga"],
      "Holehonnur": ["Holehonnur Town", "Kumsi", "Gajanoor Dam Area"]
    },
    "Sagara": {
      "Kasaba Sagara": ["Sagara Areca Town", "Anandapuram"],
      "Kargal": ["Jog Falls Viewpoint", "Kargal Hydro Town", "Talaguppa"]
    },
    "Bhadravathi": {
      "Kasaba Bhadravathi": ["Bhadravathi Steel Town", "Paper Town"],
      "Kudli": ["Kudli Tunga Bhadra Sangam", "Holehonnur Road"]
    },
    "Thirthahalli": {
      "Kasaba Thirthahalli": ["Thirthahalli Tunga River Town", "Agumbe Sunset Point"],
      "Agumbe": ["Agumbe Rainforest Center", "Mundagaru", "Ranjadakatte"]
    }
  },
  "Tumakuru": {
    "Tumakuru Taluk": {
      "Kasaba Tumakuru": ["Tumakuru Smart City", "Kyathsandra Siddaganga Mutt", "SS Puram"],
      "Urdigere": ["Devarayanadurga Hill Temple", "Urdigere Village", "Bellavi"],
      "Bellavi": ["Bellavi Village", "Gulur"]
    },
    "Gubbi": {
      "Kasaba Gubbi": ["Gubbi Town", "Nittur"],
      "Chelur": ["Chelur Village", "C S Pura", "Kadaba"]
    },
    "Sira": {
      "Kasaba Sira": ["Sira Fort Town", "Kallambella"],
      "Kallambella": ["Kallambella Lake Area", "Bukkapatna"]
    },
    "Tiptur": {
      "Kasaba Tiptur": ["Tiptur Coconut City", "Halkurke"],
      "Kibbanahalli": ["Kibbanahalli Cross", "Nonavinakere"]
    }
  },
  "Udupi": {
    "Udupi Taluk": {
      "Kasaba Udupi": ["Udupi Sri Krishna Temple Area", "Manipal University City", "Malpe Beach"],
      "Manipal": ["Manipal Edu Campus", "End Point Manipal", "Parkala"],
      "Kaup": ["Kaup Lighthouse Beach", "Katapady", "Shirva"]
    },
    "Kundapura": {
      "Kasaba Kundapura": ["Kundapura Coastal Town", "Koteshwara"],
      "Basrur": ["Basrur Heritage Port", "Tallur", "Gangolli"]
    },
    "Karkala": {
      "Kasaba Karkala": ["Karkala Gommateshwara Town", "Ajekar"],
      "Belman": ["Belman Village", "Mundkur", "Nitte Campus"]
    }
  },
  "Uttara Kannada": {
    "Karwar": {
      "Kasaba Karwar": ["Karwar Naval Port City", "Rabindranath Tagore Beach", "Majali"],
      "Baithkol": ["Baithkol Harbor", "Bingi Naval Base Area"]
    },
    "Sirsi": {
      "Kasaba Sirsi": ["Sirsi Marikamba Town", "Banavasi Ancient Capital"],
      "Banavasi": ["Banavasi Temple Area", "Sonda Vadiraja Mutt"]
    },
    "Bhatkal": {
      "Kasaba Bhatkal": ["Bhatkal Town", "Murdeshwar Temple Beach"],
      "Murdeshwar": ["Murdeshwar Shiva Statue Area", "Mundalli", "Shirali"]
    },
    "Kumta": {
      "Kasaba Kumta": ["Kumta Town", "Gokarna Temple Beach"],
      "Gokarna": ["Gokarna Main Beach", "Om Beach", "Kudle Beach", "Bada Gokarna"]
    }
  },
  "Vijayanagara": {
    "Hosapete": {
      "Kasaba Hosapete": ["Hosapete TB Dam City", "Hampi UNESCO World Heritage", "Kamalapura"],
      "Hampi": ["Hampi Bazaar", "Virupaksha Temple Area", "Vithala Temple Complex"],
      "Kamalapura": ["Kamalapura Museum Area", "Mariyammanahalli"]
    },
    "Harapanahalli": {
      "Kasaba Harapanahalli": ["Harapanahalli Town", "Teligi"],
      "Halavagalu": ["Halavagalu Village", "Arasikere Harapanahalli"]
    },
    "Huvina Hadagali": {
      "Kasaba Hadagali": ["Hadagali Mallige Town", "Hirehadagali"],
      "Itagi": ["Itagi Mahadeva Temple Area", "Holalu"]
    }
  },
  "Vijayapura": {
    "Vijayapura Taluk": {
      "Kasaba Vijayapura": ["Vijayapura Gol Gumbaz City", "Ibrahim Roza Area", "Tikkota"],
      "Tikkota": ["Tikkota Grape City", "Toravi"]
    },
    "Indi": {
      "Kasaba Indi": ["Indi Town", "Loni"],
      "Horti": ["Horti Village", "Zalaki Border"]
    },
    "Muddebihal": {
      "Kasaba Muddebihal": ["Muddebihal Town", "Talikoti"],
      "Talikoti": ["Talikoti Fort Town", "Nalatvad"]
    },
    "Basavana Bagewadi": {
      "Kasaba Bagewadi": ["Basavana Bagewadi Basavanna Birthplace", "Kudala Sangama Area"],
      "Kudala Sangama": ["Kudala Sangama Aikya Mantapa", "Managuli"]
    }
  },
  "Yadgir": {
    "Yadgir Taluk": {
      "Kasaba Yadgir": ["Yadgir Hill Fort City", "Hattikuni", "Saidapur"],
      "Saidapur": ["Saidapur Railway Town", "Balichakra"]
    },
    "Shahapur": {
      "Kasaba Shahapur": ["Shahapur Sleeping Buddha Hill Town", "Gogipeth"],
      "Gogi": ["Gogi Uranium Area", "Doranahalli"]
    },
    "Shorapur": {
      "Kasaba Shorapur": ["Shorapur Raja Palace Town", "Kembhavi"],
      "Kembhavi": ["Kembhavi Ancient Town", "Kodekal"]
    }
  }
};
