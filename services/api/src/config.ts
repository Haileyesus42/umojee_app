export const routes = {

  //NEW FLIGHT ROUTES
  //GEO ROUTES
  'GEO-POS': { oneway: 200, roundtrip: 300 },
  'POS-GEO': { oneway: 200, roundtrip: 300 },

  'GEO-TAB': { oneway: 200, roundtrip: 300 },
  'TAB-GEO': { oneway: 200, roundtrip: 300 },

  'GEO-MIA': { oneway: 200, roundtrip: 300 },
  'MIA-GEO': { oneway: 200, roundtrip: 300 },

  'GEO-YYZ': { oneway: 200, roundtrip: 300 },
  'YYZ-GEO': { oneway: 200, roundtrip: 300 },

  'GEO-MBJ': { oneway: 200, roundtrip: 300 },
  'MBJ-GEO': { oneway: 200, roundtrip: 300 },

  'GEO-HAV': { oneway: 700, roundtrip: 720 },
  'HAV-GEO': { oneway: 700, roundtrip: 720 },

  //POS ROUTES
  'POS-TAB': { oneway: 200, roundtrip: 300 },
  'TAB-POS': { oneway: 200, roundtrip: 300 },

  'POS-MIA': { oneway: 200, roundtrip: 300 },
  'MIA-POS': { oneway: 200, roundtrip: 300 },

  'POS-YYZ': { oneway: 200, roundtrip: 300 },
  'YYZ-POS': { oneway: 200, roundtrip: 300 },

  'POS-MBJ': { oneway: 200, roundtrip: 300 },
  'MBJ-POS': { oneway: 200, roundtrip: 300 },

  'POS-HAV': { oneway: 600, roundtrip: 680 },
  'HAV-POS': { oneway: 600, roundtrip: 680 },

  //TAB ROUTES
  'TAB-MIA': { oneway: 200, roundtrip: 300 },
  'MIA-TAB': { oneway: 200, roundtrip: 300 },

  'TAB-YYZ': { oneway: 200, roundtrip: 300 },
  'YYZ-TAB': { oneway: 200, roundtrip: 300 },

  'TAB-MBJ': { oneway: 200, roundtrip: 300 },
  'MBJ-TAB': { oneway: 200, roundtrip: 300 },

  'TAB-HAV': { oneway: 200, roundtrip: 300 },
  'HAV-TAB': { oneway: 200, roundtrip: 300 },

  //MIA ROUTES
  'MIA-YYZ': { oneway: 200, roundtrip: 300 },
  'YYZ-MIA': { oneway: 200, roundtrip: 300 },

  'MIA-MBJ': { oneway: 200, roundtrip: 300 },
  'MBJ-MIA': { oneway: 200, roundtrip: 300 },

  'MIA-HAV': { oneway: 200, roundtrip: 300 },
  'HAV-MIA': { oneway: 200, roundtrip: 300 },

  //YYZ ROUTES
  'YYZ-MBJ': { oneway: 200, roundtrip: 300 },
  'MBJ-YYZ': { oneway: 200, roundtrip: 300 },

  'YYZ-HAV': { oneway: 200, roundtrip: 300 },
  'HAV-YYZ': { oneway: 200, roundtrip: 300 },

  //MBJ ROUTES
  'MBJ-HAV': { oneway: 200, roundtrip: 300 },
  'HAV-MBJ': { oneway: 200, roundtrip: 300 },

} as Record<string, { oneway: number; roundtrip: number }>;



//  MBJ > HAV = 300 (Round Trip)
//  HAV > POS = 680 (Round Trip)
//  HAV > GEO = 720 (Round Trip)
//  POS > GEO = 300 (Round Trip)

//  MBJ > HAV = 200 (One Way)
// HAV > POS = 600 (One Way)
// HAV > GEO = 700 (Round Trip)
// POS > GEO = 200 (One Way)