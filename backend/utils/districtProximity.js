// Tamil Nadu district proximity mapping
const districtProximity = {
  'Chennai': ['Kanchipuram', 'Tiruvallur', 'Chengalpattu'],
  'Madurai': ['Dindigul', 'Theni', 'Virudhunagar', 'Sivaganga'],
  'Coimbatore': ['Tiruppur', 'Erode', 'Nilgiris'],
  'Salem': ['Namakkal', 'Dharmapuri', 'Erode'],
  'Trichy': ['Ariyalur', 'Perambalur', 'Karur', 'Pudukkottai'],
  'Tirunelveli': ['Thoothukudi', 'Kanyakumari', 'Virudhunagar'],
  'Erode': ['Coimbatore', 'Salem', 'Namakkal', 'Tiruppur'],
  'Vellore': ['Tirupattur', 'Ranipet', 'Tiruvallur'],
  'Thoothukudi': ['Tirunelveli', 'Virudhunagar'],
  'Thanjavur': ['Nagapattinam', 'Thiruvarur', 'Pudukkottai'],
  'Dindigul': ['Madurai', 'Theni', 'Karur'],
  'Kanchipuram': ['Chennai', 'Chengalpattu', 'Tiruvallur'],
  'Tiruppur': ['Coimbatore', 'Erode', 'Karur'],
  'Karur': ['Trichy', 'Dindigul', 'Namakkal', 'Tiruppur'],
  'Cuddalore': ['Villupuram', 'Chidambaram'],
  'Namakkal': ['Salem', 'Erode', 'Karur'],
  'Virudhunagar': ['Madurai', 'Sivaganga', 'Tirunelveli', 'Thoothukudi'],
  'Sivaganga': ['Madurai', 'Ramanathapuram', 'Virudhunagar'],
  'Ramanathapuram': ['Sivaganga', 'Pudukkottai'],
  'Pudukkottai': ['Trichy', 'Thanjavur', 'Ramanathapuram'],
  'Nagapattinam': ['Thanjavur', 'Thiruvarur', 'Mayiladuthurai'],
  'Thiruvarur': ['Thanjavur', 'Nagapattinam', 'Mayiladuthurai'],
  'Theni': ['Madurai', 'Dindigul'],
  'Dharmapuri': ['Salem', 'Krishnagiri'],
  'Krishnagiri': ['Dharmapuri', 'Vellore'],
  'Villupuram': ['Cuddalore', 'Kallakurichi'],
  'Kallakurichi': ['Villupuram', 'Salem'],
  'Ariyalur': ['Trichy', 'Perambalur', 'Cuddalore'],
  'Perambalur': ['Trichy', 'Ariyalur'],
  'Nilgiris': ['Coimbatore', 'Erode'],
  'Tiruvallur': ['Chennai', 'Kanchipuram', 'Vellore'],
  'Chengalpattu': ['Chennai', 'Kanchipuram'],
  'Tirupattur': ['Vellore', 'Krishnagiri'],
  'Ranipet': ['Vellore', 'Tiruvallur'],
  'Tenkasi': ['Tirunelveli', 'Virudhunagar'],
  'Kanyakumari': ['Tirunelveli'],
  'Mayiladuthurai': ['Nagapattinam', 'Thiruvarur', 'Thanjavur']
};

const getNearbyDistricts = (district) => {
  return districtProximity[district] || [];
};

module.exports = { getNearbyDistricts };