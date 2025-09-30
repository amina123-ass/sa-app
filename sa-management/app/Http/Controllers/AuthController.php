<?php
// app/Http/Controllers/AuthController.php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\SecurityQuestion;
use App\Models\UserSecurityAnswer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nom_user' => 'required|string|max:255',
            'prenom_user' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'tel_user' => 'required|string|max:20',
            'adresse_user' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Créer l'utilisateur avec activer_compte = false par défaut
            $user = User::create([
                'nom_user' => $request->nom_user,
                'prenom_user' => $request->prenom_user,
                'email' => $request->email,
                'tel_user' => $request->tel_user,
                'adresse_user' => $request->adresse_user,
                'activer_compte' => false, // Par défaut, le compte n'est pas activé
            ]);

            Log::info('User created successfully', [
                'user_id' => $user->id,
                'email' => $user->email,
                'account_activated' => false
            ]);

            // Envoyer l'email de vérification
            event(new Registered($user));
            $user->sendEmailVerificationNotification();

            Log::info('Verification email sent successfully', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);

            return response()->json([
                'message' => 'Compte créé avec succès. Un email de vérification a été envoyé à ' . $user->email . '. Après vérification, votre compte sera examiné par un administrateur.',
                'user' => [
                    'id' => $user->id,
                    'nom_user' => $user->nom_user,
                    'prenom_user' => $user->prenom_user,
                    'email' => $user->email,
                    'email_verified_at' => $user->email_verified_at,
                    'activer_compte' => $user->activer_compte
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('Registration failed', [
                'error' => $e->getMessage(),
                'email' => $request->email
            ]);

            return response()->json([
                'message' => 'Erreur lors de la création du compte',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Identifiants incorrects'], 401);
        }

        // Vérifications spécifiques pour l'activation du compte
        if (!$user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Veuillez vérifier votre adresse email avant de vous connecter. Consultez votre boîte de réception.',
                'code' => 'EMAIL_NOT_VERIFIED'
            ], 403);
        }

        if (!$user->activer_compte) {
            return response()->json([
                'message' => 'Votre compte est en attente d\'activation par un administrateur. Vous recevrez un email dès que votre compte sera activé.',
                'code' => 'ACCOUNT_NOT_ACTIVATED'
            ], 403);
        }

        if (!$user->canLogin()) {
            return response()->json([
                'message' => 'Votre compte n\'est pas autorisé à se connecter. Contactez l\'administrateur.',
                'code' => 'ACCOUNT_RESTRICTED'
            ], 403);
        }

        // Créer le token d'authentification
        $token = $user->createToken('auth_token')->plainTextToken;

        Log::info('User logged in successfully', [
            'user_id' => $user->id,
            'email' => $user->email
        ]);

        return response()->json([
            'user' => $user->load('role'),
            'token' => $token,
            'message' => 'Connexion réussie'
        ], 200);
    }

    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'method' => 'required|in:email,security'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->first();

        if ($request->method === 'security') {
            $questions = $user->securityAnswers()->with('securityQuestion')->get();
            return response()->json([
                'questions' => $questions->map(function($answer) {
                    return [
                        'id' => $answer->securityQuestion->id,
                        'question' => $answer->securityQuestion->question
                    ];
                })
            ]);
        }

        // MÉTHODE EMAIL : Envoyer vraiment l'email de réinitialisation
        try {
            // Supprimer les anciens tokens pour cet email
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();

            // Générer un nouveau token
            $token = Str::random(64);

            // Sauvegarder le token en base
            DB::table('password_reset_tokens')->insert([
                'email' => $request->email,
                'token' => Hash::make($token),
                'created_at' => Carbon::now()
            ]);

            // Envoyer l'email de réinitialisation
            $user->sendPasswordResetNotification($token);

            Log::info('Password reset email sent', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);

            return response()->json([
                'message' => 'Email de réinitialisation envoyé avec succès. Vérifiez votre boîte de réception.'
            ], 200);

        } catch (\Exception $e) {
            Log::error('Failed to send password reset email', [
                'email' => $request->email,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Erreur lors de l\'envoi de l\'email de réinitialisation'
            ], 500);
        }
    }

    public function resetPasswordWithToken(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Vérifier le token
            $passwordReset = DB::table('password_reset_tokens')
                ->where('email', $request->email)
                ->first();

            if (!$passwordReset) {
                return response()->json(['message' => 'Token de réinitialisation introuvable'], 404);
            }

            // Vérifier si le token n'a pas expiré (60 minutes)
            if (Carbon::parse($passwordReset->created_at)->addMinutes(60)->isPast()) {
                DB::table('password_reset_tokens')->where('email', $request->email)->delete();
                return response()->json(['message' => 'Token de réinitialisation expiré'], 400);
            }

            // Vérifier le token
            if (!Hash::check($request->token, $passwordReset->token)) {
                return response()->json(['message' => 'Token de réinitialisation invalide'], 400);
            }

            // Mettre à jour le mot de passe
            $user = User::where('email', $request->email)->first();
            $user->update(['password' => $request->password]);

            // Supprimer le token utilisé
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();

            // Supprimer tous les tokens d'authentification existants
            $user->tokens()->delete();

            Log::info('Password reset successfully', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);

            return response()->json([
                'message' => 'Mot de passe réinitialisé avec succès'
            ], 200);

        } catch (\Exception $e) {
            Log::error('Password reset failed', [
                'email' => $request->email,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Erreur lors de la réinitialisation du mot de passe'
            ], 500);
        }
    }

    public function setupSecurity(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'password' => 'required|string|min:8|confirmed',
            'security_answers' => 'required|array|size:3',
            'security_answers.*.question_id' => 'required|exists:security_questions,id',
            'security_answers.*.answer' => 'required|string|min:2',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email non vérifié'], 403);
        }

        $user->update(['password' => $request->password]);

        foreach ($request->security_answers as $answer) {
            UserSecurityAnswer::create([
                'user_id' => $user->id,
                'security_question_id' => $answer['question_id'],
                'answer' => $answer['answer']
            ]);
        }

        return response()->json([
            'message' => 'Configuration de sécurité terminée. Votre compte est maintenant en attente d\'activation par un administrateur.'
        ], 200);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnexion réussie'], 200);
    }

    public function getSecurityQuestions()
    {
        $questions = SecurityQuestion::where('active', true)->get();
        return response()->json($questions);
    }

    public function verifySecurityAnswers(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'answers' => 'required|array|size:3',
            'answers.*.question_id' => 'required|exists:security_questions,id',
            'answers.*.answer' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->first();
        $correctAnswers = 0;

        foreach ($request->answers as $answer) {
            $userAnswer = UserSecurityAnswer::where('user_id', $user->id)
                ->where('security_question_id', $answer['question_id'])
                ->first();

            if ($userAnswer && $userAnswer->checkAnswer($answer['answer'])) {
                $correctAnswers++;
            }
        }

        if ($correctAnswers === 3) {
            $token = $user->createToken('reset_token', ['reset-password'])->plainTextToken;
            
            return response()->json([
                'message' => 'Réponses correctes',
                'reset_token' => $token
            ]);
        }

        return response()->json(['message' => 'Réponses incorrectes'], 401);
    }

    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $user->update(['password' => $request->password]);
        
        $user->tokens()->delete();

        return response()->json(['message' => 'Mot de passe réinitialisé avec succès'], 200);
    }

    
}