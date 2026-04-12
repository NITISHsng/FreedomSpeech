console.log("Original:", process.env.FIREBASE_PRIVATE_KEY?.substring(0, 40));
console.log("Replaced:", process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").substring(0, 40));
