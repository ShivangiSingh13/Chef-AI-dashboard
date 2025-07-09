/* global __app_id, __initial_auth_token */
import React, { useState, useEffect } from 'react';
import { ChefHat, CalendarDays, Lightbulb, Apple, Utensils, Goal, HeartPulse, ShoppingBag, Loader2, Droplet, Soup, List, CheckCircle } from 'lucide-react'; // Removed XCircle as it was unused
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, onSnapshot, limit, addDoc } from 'firebase/firestore';

// --- IMPORTANT: Firebase Configuration ---
// This configuration is specific to your Firebase project: "sample-firebase-ai-app-fe1f7"
// It has been updated with the details you provided.
const firebaseConfig = {
  apiKey: "AIzaSyDwmTEWEcTNXUrIIYL833Gf4bDKRAOlrJ4",
  authDomain: "sample-firebase-ai-app-fe1f7.firebaseapp.com",
  projectId: "sample-firebase-ai-app-fe1f7",
  storageBucket: "sample-firebase-ai-app-fe1f7.firebasestorage.app",
  messagingSenderId: "344971638053",
  appId: "1:344971638053:web:165cb1dc7004b58579d6cc"
};

// Placeholder for global app ID (provided by Canvas runtime or fallback)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-nutrichef-app';

// Dashboard Card Component
const DashboardCard = ({ icon: Icon, title, description, onClick, colorClass }) => {
  const iconBgColorClass = colorClass.split(' ')[0]; // Gets "bg-purple-600"

  return (
    <div
      className={`bg-white p-6 rounded-xl custom-shadow flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-transform duration-300 ${colorClass}`}
      onClick={onClick}
    >
      <div className={`p-3 rounded-full mb-4 ${iconBgColorClass}`}>
        <Icon size={36} className="text-white" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
};

// Main App Component
const App = () => {
  // --- Firebase States ---
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null); // 'auth' is used in onAuthStateChanged and signInWithCustomToken/signInAnonymously
  const [userId, setUserId] = useState(null); // The authenticated user's ID
  const [isAuthReady, setIsAuthReady] = useState(false); // Indicates if Firebase auth state and DB are determined
  const [isLoadingApp, setIsLoadingApp] = useState(true); // Global loading state for the entire app
  const [firebaseInitError, setFirebaseInitError] = useState(null); // To store Firebase initialization errors

  // --- User Goal States ---
  const [calorieTarget, setCalorieTarget] = useState('');
  const [proteinTarget, setProteinTarget] = useState('');
  const [waterTarget, setWaterTarget] = useState('');
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [goalMessage, setGoalMessage] = useState('');

  // --- Daily Snapshot States ---
  const [currentCalories, setCurrentCalories] = useState(0);
  const [currentProtein, setCurrentProtein] = useState(0);
  const [currentWater, setCurrentWater] = useState(0);
  const [recentFeedback, setRecentFeedback] = useState("Log a meal to get personalized feedback!");
  const [dailyGoals, setDailyGoals] = useState({ calories: 0, protein: 0, water: 0 });
  const [todayMealsList, setTodayMealsList] = useState([]);

  // --- Water Logging States ---
  const [isLoggingWater, setIsLoggingWater] = useState(false);
  const [waterLogMessage, setWaterLogMessage] = useState('');

  // --- Recipe Generation States ---
  const [recipePrompt, setRecipePrompt] = useState('');
  const [generatedRecipe, setGeneratedRecipe] = useState('');
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [recipeError, setRecipeError] = useState('');

  // --- Food Logging States ---
  const [mealLogged, setMealLogged] = useState('');
  const [foodFeedback, setFoodFeedback] = useState(''); // 'foodFeedback' is used to display feedback to the user
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  // --- Meal Planning States ---
  const [mealPlanPrompt, setMealPlanPrompt] = useState('');
  const [generatedMealPlan, setGeneratedMealPlan] = useState('');
  const [isGeneratingMealPlan, setIsGeneratingMealPlan] = useState(false);
  const [mealPlanError, setMealPlanError] = useState('');

  // --- Personalized Recommendation States ---
  const [recommendationPrompt, setRecommendationPrompt] = useState('');
  const [personalizedRecommendation, setPersonalizedRecommendation] = useState('');
  const [isGettingRecommendation, setIsGettingRecommendation] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');

  // --- Leftover Transformation States ---
  const [leftoverIngredients, setLeftoverIngredients] = useState('');
  const [transformedRecipe, setTransformedRecipe] = useState('');
  const [isTransformingLeftovers, setIsTransformingLeftovers] = useState(false);
  const [leftoverError, setLeftoverError] = useState('');

  // --- Explore & Discover Dynamic Content States ---
  const [trendingRecipes, setTrendingRecipes] = useState([]);
  const [isLoadingTrendingRecipes, setIsLoadingTrendingRecipes] = useState(true);
  const [autoShoppingList, setAutoShoppingList] = useState([]);
  const [isLoadingAutoShoppingList, setIsLoadingAutoShoppingList] = useState(true);
  const [wellnessInsights, setWellnessInsights] = useState('');
  const [isLoadingWellnessInsights, setIsLoadingWellnessInsights] = useState(true);


  // --- Firebase Initialization and Auth ---
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const firestoreInstance = getFirestore(app);

      setDb(firestoreInstance);
      setAuth(authInstance);

      const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
        let determinedUserId = null;
        if (user) {
          determinedUserId = user.uid;
        } else {
          try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
              const userCredential = await signInWithCustomToken(authInstance, __initial_auth_token);
              determinedUserId = userCredential.user.uid;
            } else {
              const userCredential = await signInAnonymously(authInstance);
              determinedUserId = userCredential.user.uid;
            }
          } catch (error) {
            console.error("Firebase Anonymous Sign-in/Custom Token Error:", error);
            // Fallback if auth fails - important for allowing app to proceed even without auth
            // This fallback is only for the userId display, actual Firestore operations will still fail
            // if firebaseConfig.apiKey is invalid.
            determinedUserId = `auth-error-${crypto.randomUUID().substring(0, 8)}`;
            setFirebaseInitError(`Firebase Authentication failed: ${error.message}. Please ensure your firebaseConfig.apiKey is valid.`);
          }
        }
        setUserId(determinedUserId);
        setIsAuthReady(true);
        setIsLoadingApp(false);
        console.log("Firebase Auth Ready. User ID:", determinedUserId);
      });

      // Fetch dynamic content for Explore & Discover section on initial load
      // These calls are independent of Firebase auth, but rely on Gemini API key
      fetchTrendingRecipes();
      fetchAutoShoppingList();
      fetchWellnessInsights();

      return () => unsubscribe();
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      setFirebaseInitError(`Failed to initialize Firebase: ${error.message}. Data persistence features will not work. Please check your firebaseConfig.`);
      setIsLoadingApp(false);
    }
  }, []);

  // --- Firestore Listeners for Goals, Meals, and Water ---
  useEffect(() => {
    if (!db || !userId || !isAuthReady || firebaseInitError) { // Also check firebaseInitError
      console.log("Firestore listeners not active: DB, userId, auth, or firebaseInitError present.");
      return;
    }
    console.log("Firestore listeners activating for User ID:", userId);

    const goalsDocRef = doc(db, `artifacts/${appId}/users/${userId}/goals/dailyGoals`);
    const unsubscribeGoals = onSnapshot(goalsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDailyGoals({
          calories: data.calorieTarget || 0,
          protein: data.proteinTarget || 0,
          water: data.waterTarget || 0
        });
        setCalorieTarget(data.calorieTarget || '');
        setProteinTarget(data.proteinTarget || '');
        setWaterTarget(data.waterTarget || '');
      } else {
        setDailyGoals({ calories: 0, protein: 0, water: 0 });
        setCalorieTarget('');
        setProteinTarget('');
        setWaterTarget('');
      }
    }, (error) => {
      console.error("Error fetching goals:", error);
      setFirebaseInitError(`Error fetching goals: ${error.message}. Check Firestore Rules.`);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const mealsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/meals`);
    const unsubscribeMeals = onSnapshot(query(mealsCollectionRef, limit(20)), (snapshot) => {
      let totalCalories = 0;
      let totalProtein = 0;
      let latestFeedback = "Log a meal to get personalized feedback!";
      let latestMealTimestamp = 0;
      const meals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const todayMeals = meals.filter(meal => {
        const mealDate = new Date(meal.timestamp);
        return mealDate >= today && mealDate < tomorrow;
      }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      todayMeals.forEach(meal => {
        totalCalories += meal.estimatedNutrition?.calories || 0;
        totalProtein += meal.estimatedNutrition?.protein || 0;
        if (new Date(meal.timestamp).getTime() > latestMealTimestamp) {
          latestMealTimestamp = new Date(meal.timestamp).getTime();
          latestFeedback = meal.feedback || "Thanks for logging your meal!";
        }
      });

      setCurrentCalories(totalCalories);
      setCurrentProtein(totalProtein);
      setRecentFeedback(latestFeedback);
      setTodayMealsList(todayMeals);

    }, (error) => {
      console.error("Error fetching meals:", error);
      setFirebaseInitError(`Error fetching meals: ${error.message}. Check Firestore Rules.`);
    });

    const waterCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/waterLogs`);
    const unsubscribeWater = onSnapshot(query(waterCollectionRef, limit(20)), (snapshot) => {
      let totalWater = 0;
      const waterLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const todayWaterLogs = waterLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= today && logDate < tomorrow;
      });

      todayWaterLogs.forEach(log => {
        totalWater += log.amount || 0;
      });
      setCurrentWater(totalWater);
    }, (error) => {
      console.error("Error fetching water logs:", error);
      setFirebaseInitError(`Error fetching water logs: ${error.message}. Check Firestore Rules.`);
    });

    return () => {
      unsubscribeGoals();
      unsubscribeMeals();
      unsubscribeWater();
    };
  }, [db, userId, isAuthReady, firebaseInitError]); // Added firebaseInitError to dependencies

  // --- Goal Setting Functions ---
  const handleSaveGoals = async () => {
    if (!db || !userId || !isAuthReady || firebaseInitError) {
      setGoalMessage('App not fully initialized or Firebase error. Please wait or check for configuration errors.');
      return;
    }
    if (!calorieTarget || !proteinTarget || !waterTarget || isNaN(calorieTarget) || isNaN(proteinTarget) || isNaN(waterTarget)) {
      setGoalMessage('Please enter valid numbers for all targets.');
      return;
    }

    setIsSavingGoals(true);
    setGoalMessage('');
    try {
      const goalsDocRef = doc(db, `artifacts/${appId}/users/${userId}/goals/dailyGoals`);
      await setDoc(goalsDocRef, {
        calorieTarget: parseFloat(calorieTarget),
        proteinTarget: parseFloat(proteinTarget),
        waterTarget: parseFloat(waterTarget),
        updatedAt: new Date().toISOString()
      });
      setGoalMessage('Goals saved successfully!');
    } catch (error) {
      console.error("Error saving goals:", error);
      setGoalMessage(`Failed to save goals: ${error.message}. Check Firebase configuration and rules.`);
    } finally {
      setIsSavingGoals(false);
    }
  };

  // --- Water Logging Function ---
  const handleLogWater = async (amount) => {
    if (!db || !userId || !isAuthReady || firebaseInitError) {
      setWaterLogMessage('App not fully initialized or Firebase error. Please wait or check for configuration errors.');
      return;
    }
    setIsLoggingWater(true);
    setWaterLogMessage('');
    try {
      const waterCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/waterLogs`);
      await addDoc(waterCollectionRef, {
        amount: amount,
        timestamp: new Date().toISOString(),
      });
      setWaterLogMessage(`Logged ${amount} glasses!`);
    } catch (error) {
      console.error("Error logging water:", error);
      setWaterLogMessage(`Failed to log water: ${error.message}. Check Firebase configuration and rules.`);
    } finally {
      setIsLoggingWater(false);
      setTimeout(() => setWaterLogMessage(''), 3000);
    }
  };

  // --- AI API Calls ---
  // Gemini API Key - using the key provided by the user in the conversation.
  // In a production environment, this should ideally be loaded from secure environment variables.
  const GEMINI_API_KEY = "AIzaSyA7HupQNWoEU8AdQsS1Vi-aaVWg0-gqSL4"; 

  const generateRecipe = async () => {
    setIsGeneratingRecipe(true);
    setGeneratedRecipe('');
    setRecipeError('');

    if (!recipePrompt.trim()) {
      setRecipeError('Oops! Tell me what you wanna cook first.');
      setIsGeneratingRecipe(false);
      return;
    }

    const apiKey = GEMINI_API_KEY; 
    if (!apiKey) { // Check if API key is empty
      setRecipeError('Gemini API Key is missing. Please provide it in the code.');
      setIsGeneratingRecipe(false);
      return;
    }

    try {
      let chatHistory = [];
      chatHistory.push({
        role: "user",
        parts: [{ text: `Generate a detailed recipe based on the following request: "${recipePrompt}". Include step-by-step instructions, exact quantities, estimated cooking time, and a nutritional breakdown (calories, protein, carbs, fat). Also, suggest an alternate version (e.g., low-carb, high-protein, or indulgent) if applicable.` }]
      });

      const payload = { contents: chatHistory };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API response not OK for recipe generation: Status ${response.status}, ${response.statusText}`, errorBody);
        setRecipeError(`Failed to generate recipe: ${response.statusText || 'Network Error'}. Please check your Gemini API key or network connection.`);
        return;
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setGeneratedRecipe(text);
      } else {
        setRecipeError('Uh oh! The AI couldn\'t generate a valid recipe. This might be due to an unusual request or an internal AI issue. Please try a different prompt.');
        console.error('API response structure unexpected or empty candidates for recipe:', result);
      }
    } catch (error) {
      setRecipeError(`Whoops! Something went wrong with the connection: ${error.message}. Check your internet or browser console.`);
      console.error('Error generating recipe:', error);
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  const logMealAndGetFeedback = async () => {
    if (!db || !userId || !isAuthReady || firebaseInitError) {
      setFeedbackError('App not fully initialized or Firebase error. Please wait or check for configuration errors.');
      return;
    }
    setIsGettingFeedback(true);
    setFoodFeedback('');
    setFeedbackError('');

    if (!mealLogged.trim()) {
      setFeedbackError('Gotta tell me what you ate to get feedback!');
      setIsGettingFeedback(false);
      return;
    }

    const apiKey = GEMINI_API_KEY; 
    if (!apiKey) { 
      setFeedbackError('Gemini API Key is missing. Please provide it in the code.');
      setIsGettingFeedback(false);
      return;
    }

    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const nutritionPrompt = `Estimate the calories, protein, carbohydrates, and fat for the following meal: "${mealLogged}". Provide the response as a JSON object with keys "calories", "protein", "carbohydrates", and "fat". Example: {"calories": 350, "protein": 25, "carbohydrates": 40, "fat": 15}. If you cannot estimate, use 0 for values.`;
      const nutritionPayload = {
        contents: [{ role: "user", parts: [{ text: nutritionPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              calories: { type: "NUMBER" },
              protein: { type: "NUMBER" },
              carbohydrates: { type: "NUMBER" },
              fat: { type: "NUMBER" }
            },
            propertyOrdering: ["calories", "protein", "carbohydrates", "fat"]
          }
        }
      };

      const nutritionResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nutritionPayload) // Corrected from 'payload' to 'nutritionPayload'
      });
      
      if (!nutritionResponse.ok) {
        const errorBody = await nutritionResponse.text();
        console.error(`API response not OK for nutrition: Status ${nutritionResponse.status}, ${nutritionResponse.statusText}`, errorBody);
        setFeedbackError(`Failed to get nutrition: ${nutritionResponse.statusText || 'Network Error'}. Please check your Gemini API key or network connection.`);
        setIsGettingFeedback(false);
        return;
      }

      const nutritionResult = await nutritionResponse.json();
      let estimatedNutrition = { calories: 0, protein: 0, carbohydrates: 0, fat: 0 };

      if (nutritionResult.candidates && nutritionResult.candidates.length > 0 &&
          nutritionResult.candidates[0].content && nutritionResult.candidates[0].content.parts &&
          nutritionResult.candidates[0].content.parts.length > 0) {
        try {
          estimatedNutrition = JSON.parse(nutritionResult.candidates[0].content.parts[0].text);
          estimatedNutrition.calories = typeof estimatedNutrition.calories === 'number' ? estimatedNutrition.calories : 0;
          estimatedNutrition.protein = typeof estimatedNutrition.protein === 'number' ? estimatedNutrition.protein : 0;
          estimatedNutrition.carbohydrates = typeof estimatedNutrition.carbohydrates === 'number' ? estimatedNutrition.carbohydrates : 0;
          estimatedNutrition.fat = typeof estimatedNutrition.fat === 'number' ? estimatedNutrition.fat : 0;

        } catch (parseError) {
          console.warn("Failed to parse nutrition JSON, using default zeros:", parseError);
        }
      } else {
        console.warn("No nutrition estimate from AI.");
      }

      const feedbackPrompt = `I just ate: "${mealLogged}". Provide personalized feedback on this meal. Format the feedback using clear bullet points and ample line breaks for easy readability. For example, suggest if it met a protein target, if it was balanced, or if a lighter meal might be needed later. Keep it concise, encouraging, and easy to scan.`;
      const feedbackPayload = { contents: [{ role: "user", parts: [{ text: feedbackPrompt }] }] };

      const feedbackResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackPayload) // Corrected from 'payload' to 'feedbackPayload'
      });

      if (!feedbackResponse.ok) {
        const errorBody = await feedbackResponse.text();
        console.error(`API response not OK for feedback: Status ${feedbackResponse.status}, ${feedbackResponse.statusText}`, errorBody);
        setFeedbackError(`Failed to get feedback: ${feedbackResponse.statusText || 'Network Error'}. Please check your Gemini API key or network connection.`);
        setIsGettingFeedback(false);
        return;
      }

      const feedbackResult = await feedbackResponse.json();
      let feedbackText = "Thanks for logging your meal!";

      if (feedbackResult.candidates && feedbackResult.candidates.length > 0 &&
          feedbackResult.candidates[0].content && feedbackResult.candidates[0].content.parts &&
          feedbackResult.candidates[0].content.parts.length > 0) {
        feedbackText = feedbackResult.candidates[0].content.parts[0].text;
      } else {
        console.warn("No feedback generated by AI.");
      }

      const mealsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/meals`);
      await addDoc(mealsCollectionRef, {
        mealDescription: mealLogged,
        estimatedNutrition: estimatedNutrition,
        feedback: feedbackText,
        timestamp: new Date().toISOString(),
      });

      setMealLogged('');
      setFoodFeedback(feedbackText);
      setFeedbackError('');

    } catch (error) {
      setFeedbackError(`Oops! Had trouble logging meal or getting feedback: ${error.message}`);
      console.error('Error logging meal/feedback:', error);
    } finally {
      setIsGettingFeedback(false);
    }
  };

  const generateMealPlan = async () => {
    setIsGeneratingMealPlan(true);
    setGeneratedMealPlan('');
    setMealPlanError('');

    if (!mealPlanPrompt.trim()) {
      setMealPlanError('Tell me what kind of meal plan you need!');
      setIsGeneratingMealPlan(false);
      return;
    }

    const apiKey = GEMINI_API_KEY; 
    if (!apiKey) { 
      setMealPlanError('Gemini API Key is missing. Please provide it in the code.');
      setIsGeneratingMealPlan(false);
      return;
    }

    try {
      let chatHistory = [];
      chatHistory.push({
        role: "user",
        parts: [{ text: `Generate a meal plan based on the following request: "${mealPlanPrompt}". Provide a clear, easy-to-read format using headings and bullet points for each day and meal. Break it down into breakfast, lunch, dinner, and snacks. Include specific recipe ideas or food suggestions for each meal. For example, if the user asks for "keto for a week", provide a 7-day keto meal plan with specific meal suggestions structured clearly.` }]
      });

      const payload = { contents: chatHistory };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API response not OK for meal plan generation: Status ${response.status}, ${response.statusText}`, errorBody);
        setMealPlanError(`Failed to generate meal plan: ${response.statusText || 'Network Error'}. Please check your Gemini API key or network connection.`);
        return;
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setGeneratedMealPlan(text);
      } else {
        setMealPlanError('Couldn\'t cook up that meal plan. The AI might need a more specific request or is experiencing an issue. Please try a different prompt.');
        console.error('API response structure unexpected or empty candidates for meal plan:', result);
      }
    } catch (error) {
      setMealPlanError(`Meal plan magic failed: ${error.message}`);
      console.error('Error generating meal plan:', error);
    } finally {
      setIsGeneratingMealPlan(false);
    }
  };

  const getPersonalizedRecommendation = async () => {
    setIsGettingRecommendation(true);
    setPersonalizedRecommendation('');
    setRecommendationError('');

    if (!recommendationPrompt.trim()) {
      setRecommendationError('What kind of recommendation are you looking for?');
      setIsGettingRecommendation(false);
      return;
    }

    const apiKey = GEMINI_API_KEY; 
    if (!apiKey) { 
      setRecommendationError('Gemini API Key is missing. Please provide it in the code.');
      setIsGettingRecommendation(false);
      return;
    }

    try {
      let chatHistory = [];
      chatHistory.push({
        role: "user",
        parts: [{ text: `Based on the following user goal/situation: "${recommendationPrompt}", provide a personalized food recommendation. Format this recommendation with clear headings, bullet points, and ample line breaks for easy readability. Focus on actionable tips and specific food ideas. Keep it friendly and encouraging.` }]
      });

      const payload = { contents: chatHistory };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API response not OK for recommendation: Status ${response.status}, ${response.statusText}`, errorBody);
        setRecommendationError(`Failed to fetch recommendation: ${response.statusText || 'Network Error'}. Please check your Gemini API key or network connection.`);
        return;
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setPersonalizedRecommendation(text);
      } else {
        setRecommendationError('Couldn\'t fetch a recommendation for you. The AI might need a clearer request or is experiencing an issue. Please try rephrasing?');
        console.error('API response structure unexpected or empty candidates for recommendation:', result);
      }
    } catch (error) {
      setRecommendationError(`Recommendation trouble: ${error.message}`);
      console.error('Error getting recommendation:', error);
    } finally {
      setIsGettingRecommendation(false);
    }
  };

  const transformLeftovers = async () => {
    setIsTransformingLeftovers(true);
    setTransformedRecipe('');
    setLeftoverError('');

    if (!leftoverIngredients.trim()) {
      setLeftoverError('Please list your leftover ingredients!');
      setIsTransformingLeftovers(false);
      return;
    }

    const apiKey = GEMINI_API_KEY; 
    if (!apiKey) { 
      setLeftoverError('Gemini API Key is missing. Please provide it in the code.');
      setIsTransformingLeftovers(false);
      return;
    }

    try {
      let chatHistory = [];
      chatHistory.push({
        role: "user",
        parts: [{ text: `Given the following leftover ingredients: "${leftoverIngredients}". Suggest a creative and easy recipe or meal idea. Include a brief description, a list of main components/ingredients needed (including the leftovers), and simple step-by-step instructions. Focus on minimizing additional ingredients if possible. Format using clear headings and bullet points.` }]
      });

      const payload = { contents: chatHistory };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API response not OK for leftover transformation: Status ${response.status}, ${response.statusText}`, errorBody);
        setLeftoverError(`Failed to transform leftovers: ${response.statusText || 'Network Error'}. Please check your Gemini API key or network connection.`);
        return;
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setTransformedRecipe(text);
      } else {
        setLeftoverError('Couldn\'t transform your leftovers into a recipe. The AI might need more details or is experiencing an issue. Please try different ingredients or a more specific request.');
        console.error('API response structure unexpected or empty candidates for leftovers:', result);
      }
    } catch (error) {
      setLeftoverError(`Leftover magic failed: ${error.message}`);
      console.error('Error transforming leftovers:', error);
    } finally {
      setIsTransformingLeftovers(false);
    }
  };

  // --- Functions to fetch dynamic content for Explore & Discover ---
  const fetchTrendingRecipes = async () => {
    setIsLoadingTrendingRecipes(true);
    const apiKey = GEMINI_API_KEY; 
    if (!apiKey) { 
      setTrendingRecipes(["Gemini API Key missing for trending recipes."]);
      setIsLoadingTrendingRecipes(false);
      return;
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const prompt = `Suggest 3-5 popular or trending healthy recipes. Provide them as a numbered list of recipe names only. Example: "1. Quinoa Salad with Roasted Vegetables\n2. Sheet Pan Lemon Herb Chicken\n3. Spicy Lentil Soup"`;
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API response not OK for trending recipes: Status ${response.status}, ${response.statusText}`, errorBody);
        setTrendingRecipes(["Failed to load trending recipes: Network Error. Please check your Gemini API key."]);
        return;
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        const rawText = await response.text();
        console.error("JSON parsing error for trending recipes:", jsonError, "Raw response:", rawText);
        setTrendingRecipes(["Failed to load trending recipes: Invalid response format."]);
        return;
      }
      
      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        const recipes = text.split('\n').map(item => item.replace(/^\d+\.\s*/, '').trim()).filter(item => item.length > 0);
        setTrendingRecipes(recipes);
      } else {
        console.warn("No trending recipes generated by AI or unexpected structure:", result);
        setTrendingRecipes(["Failed to load trending recipes: No content."]);
      }
    } catch (error) {
      console.error("Error fetching trending recipes:", error);
      setTrendingRecipes(["Error loading trending recipes."]);
    } finally {
      setIsLoadingTrendingRecipes(false);
    }
  };

  const fetchAutoShoppingList = async () => {
    setIsLoadingAutoShoppingList(true);
    const apiKey = GEMINI_API_KEY; 
    if (!apiKey) { 
      setAutoShoppingList(["Gemini API Key missing for shopping list."]);
      setIsLoadingAutoShoppingList(false);
      return;
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const prompt = `Generate a short, general shopping list for common healthy meals. Provide 3-5 items as a bulleted list of ingredients only. Example: "- Chicken breast\n- Broccoli\n- Brown rice"`;
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API response not OK for shopping list: Status ${response.status}, ${response.statusText}`, errorBody);
        setAutoShoppingList(["Failed to load shopping list: Network Error. Please check your Gemini API key."]);
        return;
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        const rawText = await response.text();
        console.error("JSON parsing error for shopping list:", jsonError, "Raw response:", rawText);
        setAutoShoppingList(["Failed to load shopping list: Invalid response format."]);
        return;
      }
      
      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        const items = text.split('\n').map(item => item.replace(/^-+\s*/, '').trim()).filter(item => item.length > 0);
        setAutoShoppingList(items);
      } else {
        console.warn("No shopping list generated by AI or unexpected structure:", result);
        setAutoShoppingList(["Failed to load shopping list: No content."]);
      }
    } catch (error) {
      console.error("Error fetching shopping list:", error);
      setAutoShoppingList(["Error loading shopping list."]);
    } finally {
      setIsLoadingAutoShoppingList(false);
    }
  };

  const fetchWellnessInsights = async () => {
    setIsLoadingWellnessInsights(true);
    const apiKey = GEMINI_API_KEY; 
    if (!apiKey) { 
      setWellnessInsights("Gemini API Key missing for wellness insights.");
      setIsLoadingWellnessInsights(false);
      return;
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const prompt = `Provide 2-3 concise, general wellness insights or nutrition tips. Format them as short paragraphs or sentences. Example: "Stay hydrated by drinking water throughout the day. Incorporate colorful fruits and vegetables for essential vitamins."`;
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`API response not OK for wellness insights: Status ${response.status}, ${response.statusText}`, errorBody);
        setWellnessInsights("Failed to load wellness insights: Network Error. Please check your Gemini API key.");
        return;
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        const rawText = await response.text();
        console.error("JSON parsing error for wellness insights:", jsonError, "Raw response:", rawText);
        setWellnessInsights("Failed to load wellness insights: Invalid response format.");
        return;
      }

      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setWellnessInsights(text);
      } else {
        console.warn("No wellness insights generated by AI or unexpected structure:", result);
        setWellnessInsights("Failed to load wellness insights: No content.");
      }
    } catch (error) {
      console.error("Error fetching wellness insights:", error);
      setWellnessInsights("Error loading wellness insights.");
    } finally {
      setIsLoadingWellnessInsights(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 p-8 font-sans text-gray-800 flex flex-col items-center justify-center">
      <style>
        {`
          body {
            font-family: 'Inter', sans-serif;
          }
          .custom-shadow {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 5px 15px -5px rgba(0, 0, 0, 0.04);
          }
          .bg-purple-card { background-color: #A78BFA; color: white; }
          .bg-green-card { background-color: #4ADE80; color: white; }
          .bg-yellow-card { background-color: #FACC15; color: white; }
          .bg-blue-card { background-color: #60A5FA; color: white; }
          .bg-red-card { background-color: #EF4444; color: white; } /* For stats/progress */

          .prose ul, .prose ol {
            padding-left: 1.5em;
            margin-bottom: 1em;
          }
          .prose li {
            margin-bottom: 0.5em;
          }
          .prose h3 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }
          .prose strong {
            font-weight: 700;
          }
          .prose hr {
            border-top: 1px dashed #ccc;
            margin: 2em 0;
          }
        `}
      </style>

      {isLoadingApp ? (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Loader2 className="animate-spin text-purple-600" size={64} />
          <p className="mt-4 text-xl text-gray-700">Loading NutriChef AI...</p>
          {firebaseInitError && (
            <p className="text-red-600 text-center mt-4 text-sm">{firebaseInitError}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">Establishing connection and preparing your personalized dashboard.</p>
        </div>
      ) : (
        <div className="w-full max-w-6xl bg-white rounded-xl custom-shadow p-10 space-y-10">
          <header className="text-center mb-10">
            <h1 className="text-5xl font-extrabold text-purple-800 mb-4">Welcome to NutriChef AI! 🥕</h1>
            <p className="text-xl text-gray-600">Your personalized culinary companion is ready to help you cook, plan, and thrive.</p>
            <p className="text-sm text-gray-400 mt-2">Your User ID: {userId || 'Authenticating...'}</p>
          </header>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-purple-700 text-center mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardCard
                icon={ChefHat}
                title="Generate Recipe"
                description="Whip up new recipes based on ingredients or cravings."
                onClick={generateRecipe}
                colorClass="bg-purple-600 text-purple-800"
              />
              <DashboardCard
                icon={CalendarDays}
                title="Plan My Meals"
                description="Get daily or weekly meal plans tailored for your goals."
                onClick={generateMealPlan}
                colorClass="bg-green-600 text-green-800"
              />
              <DashboardCard
                icon={Lightbulb}
                title="Get Suggestions"
                description="Receive personalized food recommendations and tips."
                onClick={getPersonalizedRecommendation}
                colorClass="bg-yellow-600 text-yellow-800"
              />
              <DashboardCard
                icon={Apple}
                title="Log My Meal"
                description="Track your food intake and get instant feedback."
                onClick={logMealAndGetFeedback}
                colorClass="bg-blue-600 text-blue-800"
              />
            </div>
          </section>

          <section className="bg-indigo-50 p-6 rounded-xl border border-indigo-200 space-y-4">
            <h2 className="text-2xl font-semibold text-indigo-600 mb-4 text-center">Set Your Daily Goals 🎯</h2>
            <p className="text-gray-600 text-center">Help NutriChef AI personalize your journey by setting your targets!</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex flex-col w-full sm:w-1/3">
                <label htmlFor="calorieGoal" className="text-gray-700 font-medium mb-1">Target Calories (kcal):</label>
                <input
                  type="number"
                  id="calorieGoal"
                  className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                  placeholder="e.g., 2000"
                  value={calorieTarget}
                  onChange={(e) => setCalorieTarget(e.target.value)}
                  min="0"
                />
              </div>
              <div className="flex flex-col w-full sm:w-1/3">
                <label htmlFor="proteinGoal" className="text-gray-700 font-medium mb-1">Target Protein (g):</label>
                <input
                  type="number"
                  id="proteinGoal"
                  className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                  placeholder="e.g., 100"
                  value={proteinTarget}
                  onChange={(e) => setProteinTarget(e.target.value)}
                  min="0"
                />
              </div>
              <div className="flex flex-col w-full sm:w-1/3">
                <label htmlFor="waterGoal" className="text-gray-700 font-medium mb-1">Target Water (glasses):</label>
                <input
                  type="number"
                  id="waterGoal"
                  className="w-full p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition duration-200"
                  placeholder="e.g., 8"
                  value={waterTarget}
                  onChange={(e) => setWaterTarget(e.target.value)}
                  min="0"
                />
              </div>
            </div>
            <button
              onClick={handleSaveGoals}
              disabled={isSavingGoals || !isAuthReady}
              className="mt-4 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSavingGoals ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} /> Saving Goals...
                </>
              ) : 'Save My Goals'}
            </button>
            {goalMessage && (
              <p className={`text-center text-sm mt-2 ${goalMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                {goalMessage}
              </p>
            )}
            {firebaseInitError && <p className="text-red-600 text-center mt-2 text-sm">Error: {firebaseInitError}</p>}
          </section>

          <section className="space-y-6 mt-10">
            <h2 className="text-3xl font-bold text-purple-700 text-center mb-6">Your Daily Snapshot</h2>
            {isAuthReady ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl custom-shadow flex flex-col justify-between">
                  <div className="flex items-center mb-4">
                    <Goal size={32} className="mr-3" />
                    <h3 className="text-2xl font-bold">Today's Goals</h3>
                  </div>
                  <ul className="text-lg space-y-2">
                    <li>
                      {currentCalories >= dailyGoals.calories && dailyGoals.calories > 0 ? (
                        <CheckCircle size={20} className="inline-block mr-2 text-green-300" />
                      ) : (
                        <Loader2 size={20} className="inline-block mr-2 text-blue-300" />
                      )}
                      Calories: {currentCalories} / {dailyGoals.calories || 'Set Goal'} kcal
                    </li>
                    <li>
                      {currentProtein >= dailyGoals.protein && dailyGoals.protein > 0 ? (
                        <CheckCircle size={20} className="inline-block mr-2 text-green-300" />
                      ) : (
                        <Loader2 size={20} className="inline-block mr-2 text-blue-300" />
                      )}
                      Protein: {currentProtein} / {dailyGoals.protein || 'Set Goal'} g
                    </li>
                    <li>
                      {currentWater >= dailyGoals.water && dailyGoals.water > 0 ? (
                        <CheckCircle size={20} className="inline-block mr-2 text-green-300" />
                      ) : (
                        <Loader2 size={20} className="inline-block mr-2 text-blue-300" />
                      )}
                      Water: {currentWater} / {dailyGoals.water || 'Set Goal'} glasses
                    </li>
                  </ul>
                  <p className="text-sm mt-4 opacity-80">Keep up the great work!</p>
                </div>

                <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-6 rounded-xl custom-shadow flex flex-col justify-between">
                  <div className="flex items-center mb-4">
                    <HeartPulse size={32} className="mr-3" />
                    <h3 className="text-2xl font-bold">Recent Feedback</h3>
                  </div>
                  <p className="text-lg mb-2 prose max-w-none text-white leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                    {recentFeedback}
                  </p>
                  <p className="text-sm mt-4 opacity-80">Insights from your food diary.</p>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500">Loading your data or Firebase not initialized.</p>
            )}
            {firebaseInitError && <p className="text-red-600 text-center mt-2 text-sm">Error: {firebaseInitError}</p>}
          </section>

          <section className="bg-cyan-50 p-6 rounded-xl border border-cyan-200 space-y-4">
            <h2 className="text-2xl font-semibold text-cyan-600 mb-4 text-center">Hydrate! 💧</h2>
            <p className="text-gray-600 text-center">Click to log a glass of water.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleLogWater(1)}
                disabled={isLoggingWater || !isAuthReady}
                className="mt-4 w-full bg-cyan-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-cyan-700 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoggingWater ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} /> Logging...
                  </>
                ) : (
                  <>
                    <Droplet className="mr-2" size={20} /> Log 1 Glass
                  </>
                )}
              </button>
            </div>
            {waterLogMessage && (
              <p className={`text-center text-sm mt-2 ${waterLogMessage.includes('Logged') ? 'text-green-600' : 'text-red-600'}`}>
                {waterLogMessage}
              </p>
            )}
            {firebaseInitError && <p className="text-red-600 text-center mt-2 text-sm">Error: {firebaseInitError}</p>}
          </section>

          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h2 className="text-2xl font-semibold text-blue-600 mb-4">What Did You Eat? 🍎</h2>
            <p className="text-gray-600 mb-4">
              Quick! Tell NutriChef AI what you just had, and I'll give you some friendly feedback to keep you on track.
            </p>
            <textarea
              className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 resize-y min-h-[80px]"
              placeholder="Like: 'Scrambled eggs with spinach and whole-wheat toast', 'A big pepperoni pizza and soda', or 'Greek yogurt with berries and granola'"
              value={mealLogged}
              onChange={(e) => setMealLogged(e.target.value)}
              rows="3"
            ></textarea>
            <button
              onClick={logMealAndGetFeedback}
              disabled={isGettingFeedback || !isAuthReady}
              className="mt-4 w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isGettingFeedback ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} /> Thinking yummy thoughts...
                </>
              ) : 'Get My Feedback!'}
            </button>
            {feedbackError && <p className="text-red-600 mt-2 text-center">{feedbackError}</p>}
            {firebaseInitError && <p className="text-red-600 text-center mt-2 text-sm">Error: {firebaseInitError}</p>}
          </div>

          <section className="bg-blue-100 p-6 rounded-xl border border-blue-300 space-y-4">
            <h2 className="text-2xl font-semibold text-blue-700 mb-4 text-center flex items-center justify-center gap-2">
              <List size={28} /> Today's Meals Log
            </h2>
            {isAuthReady ? (
              todayMealsList.length === 0 ? (
                <p className="text-gray-600 text-center">No meals logged yet today.</p>
              ) : (
                <div className="space-y-3">
                  {todayMealsList.map((meal) => (
                    <div key={meal.id} className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
                      <p className="font-semibold text-gray-800">{meal.mealDescription}</p>
                      <p className="text-sm text-gray-600">
                        Calories: {meal.estimatedNutrition?.calories || 0} kcal | Protein: {meal.estimatedNutrition?.protein || 0} g
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Logged at: {new Date(meal.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-center text-gray-500">Loading meals or Firebase not initialized.</p>
            )}
            {firebaseInitError && <p className="text-red-600 text-center mt-2 text-sm">Error: {firebaseInitError}</p>}
          </section>

          <section className="bg-orange-50 p-6 rounded-xl border border-orange-200 space-y-4">
            <h2 className="text-2xl font-semibold text-orange-600 mb-4 text-center">Leftover Transformation! ✨</h2>
            <p className="text-gray-600 mb-4">
              Got some ingredients lingering in your fridge? Tell NutriChef AI what you have, and I'll whip up a creative recipe idea to use them!
            </p>
            <textarea
              className="w-full p-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent transition duration-200 resize-y min-h-[80px]"
              placeholder="Example: 'cooked rice, some broccoli, a few eggs', 'leftover chicken, bell peppers, tortillas', 'half an onion, spinach, canned tomatoes'"
              value={leftoverIngredients}
              onChange={(e) => setLeftoverIngredients(e.target.value)}
              rows="3"
            ></textarea>
            <button
              onClick={transformLeftovers}
              disabled={isTransformingLeftovers || !isAuthReady}
              className="mt-4 w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-700 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isTransformingLeftovers ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} /> Brainstorming ideas...
                </>
              ) : (
                <>
                  <Soup className="mr-2" size={20} /> Transform Leftovers!
                </>
              )}
            </button>
            {leftoverError && <p className="text-red-600 mt-2 text-center">{leftoverError}</p>}
            {transformedRecipe && (
              <div className="mt-6 p-4 bg-white border border-orange-300 rounded-lg shadow-inner">
                <h3 className="text-xl font-semibold text-orange-700 mb-2">Your Leftover Creation: 🍲</h3>
                <div className="prose max-w-none text-gray-700 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                  {transformedRecipe}
                </div>
              </div>
            )}
            {firebaseInitError && <p className="text-red-600 text-center mt-2 text-sm">Error: {firebaseInitError}</p>}
          </section>

          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">Whip Up a Recipe! 🍳</h2>
            <p className="text-gray-600 mb-4">
              Got ingredients? Craving something specific? Or sticking to a diet? Tell NutriChef AI what's on your mind, and let's get cooking!
            </p>
            <textarea
              className="w-full p-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent transition duration-200 resize-y min-h-[80px]"
              placeholder="Like: 'healthy dinner with chicken & broccoli', 'keto-friendly lasagna, please!', or 'what can I make with leftover rice and veggies?'"
              value={recipePrompt}
              onChange={(e) => setRecipePrompt(e.target.value)}
              rows="3"
            ></textarea>
            <button
              onClick={generateRecipe}
              disabled={isGeneratingRecipe || !isAuthReady}
              className="mt-4 w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isGeneratingRecipe ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} /> Cooking up something tasty...
                </>
              ) : 'Get My Recipe!'}
            </button>
            {recipeError && <p className="text-red-600 mt-2 text-center">{recipeError}</p>}
            {generatedRecipe && (
              <div className="mt-6 p-4 bg-white border border-purple-300 rounded-lg shadow-inner">
                <h3 className="text-xl font-semibold text-purple-700 mb-2">Here's Your Dish! ✨</h3>
                <div className="prose max-w-none text-gray-700 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                  {generatedRecipe}
                </div>
              </div>
            )}
            {firebaseInitError && <p className="text-red-600 text-center mt-2 text-sm">Error: {firebaseInitError}</p>}
          </div>

          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h2 className="text-2xl font-semibold text-green-600 mb-4">Plan Your Meals! 🗓️</h2>
            <p className="text-gray-600 mb-4">
              Need a plan for the day or week? Tell me your diet goals (like 'keto', 'low-calorie', 'diabetic', or just 'balanced & varied') and for how long.
            </p>
            <textarea
              className="w-full p-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent transition duration-200 resize-y min-h-[80px]"
              placeholder="Example: 'a 7-day vegan meal plan', 'daily balanced meals for a family of four', 'low-carb plan for tomorrow'"
              value={mealPlanPrompt}
              onChange={(e) => setMealPlanPrompt(e.target.value)}
              rows="3"
            ></textarea>
            <button
              onClick={generateMealPlan}
              disabled={isGeneratingMealPlan || !isAuthReady}
              className="mt-4 w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isGeneratingMealPlan ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} /> Crafting your plan...
                </>
              ) : 'Generate Meal Plan'}
            </button>
            {mealPlanError && <p className="text-red-600 mt-2 text-center">{mealPlanError}</p>}
            {generatedMealPlan && (
              <div className="mt-6 p-4 bg-white border border-green-300 rounded-lg shadow-inner">
                <h3 className="text-xl font-semibold text-green-700 mb-2">Your Meal Plan: 📋</h3>
                <div className="prose max-w-none text-gray-700 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                  {generatedMealPlan}
                </div>
              </div>
            )}
            {firebaseInitError && <p className="text-red-600 text-center mt-2 text-sm">Error: {firebaseInitError}</p>}
          </div>

          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h2 className="text-2xl font-semibold text-yellow-600 mb-4">Need a Food Suggestion? 🤔</h2>
            <p className="text-gray-600 mb-4">
              Tell me your goal or current situation, and I'll give you a personalized food recommendation! Like balancing a cheat meal, a healthy snack, or a light dinner idea.
            </p>
            <textarea
              className="w-full p-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition duration-200 resize-y min-h-[80px]"
              placeholder="Example: 'I want to lose weight, suggest a healthy snack', 'I had a huge lunch, what's a light dinner?', 'Craving something sweet but healthy!'"
              value={recommendationPrompt}
              onChange={(e) => setRecommendationPrompt(e.target.value)}
              rows="3"
            ></textarea>
            <button
              onClick={getPersonalizedRecommendation}
              disabled={isGettingRecommendation || !isAuthReady}
              className="mt-4 w-full bg-yellow-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-yellow-700 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isGettingRecommendation ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} /> Thinking of tasty ideas...
                </>
              ) : 'Get My Suggestion!'}
            </button>
            {recommendationError && <p className="text-red-600 mt-2 text-center">{recommendationError}</p>}
            {personalizedRecommendation && (
              <div className="mt-6 p-4 bg-white border border-yellow-300 rounded-lg shadow-inner">
                <h3 className="text-xl font-semibold text-yellow-700 mb-2">NutriChef Recommends: 👇</h3>
                <div className="prose max-w-none text-gray-700 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                  {personalizedRecommendation}
                </div>
              </div>
            )}
            {firebaseInitError && <p className="text-red-600 text-center mt-2 text-sm">Error: {firebaseInitError}</p>}
          </div>

          <section className="space-y-6 mt-10">
            <h2 className="text-3xl font-bold text-purple-700 text-center mb-6">Explore & Discover</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 custom-shadow">
                <Utensils size={28} className="text-purple-500 mb-3" />
                <h3 className="text-xl font-semibold mb-2">Trending Recipes</h3>
                {isLoadingTrendingRecipes ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="animate-spin text-purple-500" size={20} />
                    <span className="ml-2 text-sm text-gray-600">Loading...</span>
                  </div>
                ) : (
                  <ul className="list-disc list-inside text-gray-700 text-sm">
                    {trendingRecipes.map((recipe, index) => (
                      <li key={index}>{recipe}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 custom-shadow">
                <ShoppingBag size={28} className="text-green-500 mb-3" />
                <h3 className="text-xl font-semibold mb-2">Auto Shopping List</h3>
                {isLoadingAutoShoppingList ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="animate-spin text-green-500" size={20} />
                    <span className="ml-2 text-sm text-gray-600">Loading...</span>
                  </div>
                ) : (
                  <ul className="list-disc list-inside text-gray-700 text-sm mt-2">
                    {autoShoppingList.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 custom-shadow">
                <HeartPulse size={28} className="text-red-500 mb-3" />
                <h3 className="text-xl font-semibold mb-2">Wellness Insights</h3>
                {isLoadingWellnessInsights ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="animate-spin text-red-500" size={20} />
                    <span className="ml-2 text-sm text-gray-600">Loading...</span>
                  </div>
                ) : (
                  <p className="text-gray-700 text-sm" style={{ whiteSpace: 'pre-wrap' }}>{wellnessInsights}</p>
                )}
              </div>
            </div>
          </section>

          <footer className="text-center text-gray-500 text-sm mt-10">
            Powered by Gemini AI
          </footer>
        </div>
      )}
    </div>
  );
};

export default App;
