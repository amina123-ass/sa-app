<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckUPASOwnership
{
    public function handle(Request $request, Closure $next, $model)
    {
        $user = auth()->user();
        
        // Seul l'administrateur peut tout voir
        if ($user->role->libelle === 'Administrateur Informatique') {
            return $next($request);
        }
        
        // Les responsables UPAS ne peuvent voir que leurs propres créations
        if ($user->role->libelle === 'Responsable UPAS') {
            $resourceId = $request->route()->parameter($model);
            $modelClass = "App\\Models\\" . ucfirst($model);
            
            if (class_exists($modelClass)) {
                $resource = $modelClass::find($resourceId);
                
                if ($resource && $resource->user_id !== $user->id) {
                    return response()->json(['message' => 'Accès non autorisé'], 403);
                }
            }
        }
        
        return $next($request);
    }
}