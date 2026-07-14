const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync(path.join(__dirname, 'data', 'db.json'));
const db = low(adapter);

db.defaults({
  users: [],
  courts: [
    {
      id: 'seed-court-1',
      name: 'Tower Grove Park Tennis & Pickleball Club',
      address: '4256 Magnolia Ave, St. Louis, MO 63110',
      surface: 'outdoor hard court',
      indoor: false,
      lights: true,
      notes: 'The largest outdoor pickleball venue in the region — 8 dedicated, permanent, lighted courts. Free public hours are weekdays noon-5pm and weekends noon-10pm.',
      addedBy: null,
      ratings: [{ userId: 'seed', rating: 5 }, { userId: 'seed2', rating: 4.5 }]
    },
    {
      id: 'seed-court-2',
      name: 'Tilles Park Pickleball Courts',
      address: 'Hampton Ave & Fyler/Marquette Ave, St. Louis, MO',
      surface: 'outdoor hard court',
      indoor: false,
      lights: false,
      notes: '6 dedicated outdoor courts with permanent nets and lines, free to play. Open 6am-10pm, but no lights for evening games. Pickup games are common around 9am and 5pm.',
      addedBy: null,
      ratings: [{ userId: 'seed', rating: 4.5 }]
    },
    {
      id: 'seed-court-3',
      name: 'Carondelet Park Pickleball & Tennis Courts',
      address: 'Carondelet Park, St. Louis, MO 63111',
      surface: 'outdoor hard court',
      indoor: false,
      lights: true,
      notes: '6 outdoor courts with restrooms on site. Courts are lighted for evening play.',
      addedBy: null,
      ratings: [{ userId: 'seed', rating: 4.2 }]
    },
    {
      id: 'seed-court-4',
      name: 'Dwight Davis Memorial Tennis Center (Forest Park)',
      address: '5215 Clayton Ave, St. Louis, MO 63110',
      surface: 'outdoor hard court',
      indoor: false,
      lights: true,
      notes: '4 dedicated courts run by a non-profit in Forest Park. $10/hour court fee, or $3 drop-in for members; reservations can be made up to 7 days ahead. Pro shop on site for paddle rentals.',
      addedBy: null,
      ratings: [{ userId: 'seed', rating: 4.6 }]
    },
    {
      id: 'seed-court-5',
      name: 'Kirkwood Park Racquet Center',
      address: 'Kirkwood Park, Kirkwood, MO 63122',
      surface: 'outdoor hard court',
      indoor: false,
      lights: false,
      notes: 'More than 20 courts available for pickleball and tennis. Lines are permanent but nets are not, so bring your own. $4/day for residents, $6 for non-residents; season passes available.',
      addedBy: null,
      ratings: [{ userId: 'seed', rating: 4.3 }]
    },
    {
      id: 'seed-court-6',
      name: 'Frontenac Racquet Club',
      address: 'Frontenac, MO 63131',
      surface: 'indoor court',
      indoor: true,
      lights: true,
      notes: '4 indoor courts (portable nets on tennis courts). Pickleball membership required, or use with a Frontenac/Woodsmill tennis membership. Restrooms on site.',
      addedBy: null,
      ratings: [{ userId: 'seed', rating: 4 }]
    },
    {
      id: 'seed-court-7',
      name: 'Sunset Tennis Center',
      address: 'St. Louis, MO',
      surface: 'indoor court',
      indoor: true,
      lights: true,
      notes: 'Open October through April with 6 dedicated pickleball courts and newer lighting. Offers organized play, clinics, and private court reservations.',
      addedBy: null,
      ratings: [{ userId: 'seed', rating: 4.4 }]
    },
    {
      id: 'seed-court-8',
      name: 'North St. Louis County Recreational Complex',
      address: 'St. Louis County, MO',
      surface: 'outdoor hard court',
      indoor: false,
      lights: false,
      notes: '4 free public courts with portable nets, open to the community.',
      addedBy: null,
      ratings: [{ userId: 'seed', rating: 3.9 }]
    },
    {
      id: 'seed-court-9',
      name: 'St. Vincent Community Center Courts',
      address: 'St. Louis County, MO',
      surface: 'outdoor hard court',
      indoor: false,
      lights: false,
      notes: '4 public courts with permanent lines but tennis nets rather than dedicated pickleball nets.',
      addedBy: null,
      ratings: [{ userId: 'seed', rating: 3.7 }]
    },
    {
      id: 'seed-court-10',
      name: 'Crestwood Community Center',
      address: 'Crestwood, MO 63126',
      surface: 'indoor court',
      indoor: true,
      lights: true,
      notes: '3 indoor courts, $3 per person drop-in.',
      addedBy: null,
      ratings: [{ userId: 'seed', rating: 4.1 }]
    }
  ],
  games: [],
  friendships: []
}).write();

module.exports = db;
