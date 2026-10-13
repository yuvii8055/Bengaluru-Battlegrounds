import React, { useState } from 'react';
import { X, Copy, Check, Code, Cpu, Compass, Layers, Bot, Video } from 'lucide-react';

interface ArchitectDocsModalProps {
  onClose: () => void;
}

export const ArchitectDocsModal: React.FC<ArchitectDocsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'zone' | 'camera' | 'bot_bt' | 'osm_gis' | 'modes'>('zone');
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const codeSnippets = {
    zone_cpp: `// ============================================================================
// File: BanashankariZoneManager.h / .cpp (Unreal Engine 5 - Production C++)
// Project: Bengaluru Battlegrounds: Banashankari BDA Complex
// ============================================================================

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "BanashankariZoneManager.generated.h"

USTRUCT(BlueprintType)
struct FZonePhaseConfig
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 PhaseNumber = 1;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float WaitDuration = 45.0f; // Seconds before shrink initiates

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float ShrinkDuration = 30.0f; // Seconds for circle lerp

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float SafeRadius = 28000.0f; // Unreal Units (280m)

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float DPS = 2.0f; // Damage per second inside Blue Zone
};

UCLASS()
class BENGALURU_API ABanashankariZoneManager : public AActor
{
    GENERATED_BODY()

public:
    ABanashankariZoneManager();

protected:
    virtual void BeginPlay() override;

public:
    virtual void Tick(float DeltaTime) override;

    // Origin: Banashankari BDA Complex (Lat: 12.92544, Lon: 77.57531 -> World Origin [0, 0, 0])
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GIS Coordinates")
    FVector BanashankariBDAOrigin = FVector::ZeroVector;

    UPROPERTY(BlueprintReadOnly, Category = "Zone State")
    FVector CurrentBlueCenter;

    UPROPERTY(BlueprintReadOnly, Category = "Zone State")
    float CurrentBlueRadius;

    UPROPERTY(BlueprintReadOnly, Category = "Zone State")
    FVector NextSafeCenter;

    UPROPERTY(BlueprintReadOnly, Category = "Zone State")
    float NextSafeRadius;

    UPROPERTY(BlueprintReadOnly, Category = "Zone State")
    bool bIsShrinking = false;

    UPROPERTY(EditAnywhere, Category = "Configuration")
    TArray<FZonePhaseConfig> Phases;

    UFUNCTION(BlueprintCallable, Category = "Zone Algorithm")
    FVector CalculateNextSafeCircle(const FVector& InCenter, float InRadius, float TargetRadius);

    UFUNCTION(BlueprintCallable, Category = "Zone Damage")
    bool IsLocationInBlueZone(const FVector& TargetLocation, float& OutDistanceOutside);

private:
    int32 CurrentPhaseIndex = 0;
    float PhaseTimer = 0.0f;
    FVector StartBlueCenter;
    float StartBlueRadius;
};

// --- Implementation File: BanashankariZoneManager.cpp ---

#include "BanashankariZoneManager.h"
#include "Kismet/KismetMathLibrary.h"

ABanashankariZoneManager::ABanashankariZoneManager()
{
    PrimaryActorTick.bCanEverTick = true;
    CurrentBlueRadius = 45000.0f; // Initial 450m radius around Banashankari
    CurrentBlueCenter = BanashankariBDAOrigin;
}

void ABanashankariZoneManager::BeginPlay()
{
    Super::BeginPlay();

    if (Phases.Num() > 0)
    {
        NextSafeCenter = CalculateNextSafeCircle(CurrentBlueCenter, CurrentBlueRadius, Phases[0].SafeRadius);
        NextSafeRadius = Phases[0].SafeRadius;
    }
}

FVector ABanashankariZoneManager::CalculateNextSafeCircle(const FVector& InCenter, float InRadius, float TargetRadius)
{
    if (TargetRadius <= 0.0f) return InCenter;

    // Mathematical constraint: d <= (R_current - R_next)
    const float MaxOffset = FMath::Max(0.0f, InRadius - TargetRadius);
    const float RandomR = FMath::Sqrt(FMath::FRand()) * MaxOffset;
    const float RandomAngle = FMath::FRandRange(0.0f, 2.0f * PI);

    return FVector(
        InCenter.X + RandomR * FMath::Cos(RandomAngle),
        InCenter.Y + RandomR * FMath::Sin(RandomAngle),
        InCenter.Z
    );
}

void ABanashankariZoneManager::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    if (CurrentPhaseIndex >= Phases.Num()) return;

    const FZonePhaseConfig& ActivePhase = Phases[CurrentPhaseIndex];
    PhaseTimer += DeltaTime;

    if (!bIsShrinking)
    {
        if (PhaseTimer >= ActivePhase.WaitDuration)
        {
            bIsShrinking = true;
            PhaseTimer = 0.0f;
            StartBlueCenter = CurrentBlueCenter;
            StartBlueRadius = CurrentBlueRadius;
        }
    }
    else
    {
        const float Alpha = FMath::Clamp(PhaseTimer / ActivePhase.ShrinkDuration, 0.0f, 1.0f);
        // Smooth Hermite Interpolation (SmoothStep)
        const float SmoothT = Alpha * Alpha * (3.0f - 2.0f * Alpha);

        CurrentBlueCenter = FMath::Lerp(StartBlueCenter, NextSafeCenter, SmoothT);
        CurrentBlueRadius = FMath::Lerp(StartBlueRadius, NextSafeRadius, SmoothT);

        if (Alpha >= 1.0f)
        {
            bIsShrinking = false;
            PhaseTimer = 0.0f;
            CurrentPhaseIndex++;

            if (CurrentPhaseIndex < Phases.Num())
            {
                NextSafeCenter = CalculateNextSafeCircle(CurrentBlueCenter, CurrentBlueRadius, Phases[CurrentPhaseIndex].SafeRadius);
                NextSafeRadius = Phases[CurrentPhaseIndex].SafeRadius;
            }
        }
    }
}

bool ABanashankariZoneManager::IsLocationInBlueZone(const FVector& TargetLocation, float& OutDistanceOutside)
{
    const float Dist2D = FVector::Dist2D(TargetLocation, CurrentBlueCenter);
    if (Dist2D > CurrentBlueRadius)
    {
        OutDistanceOutside = Dist2D - CurrentBlueRadius;
        return true;
    }
    OutDistanceOutside = 0.0f;
    return false;
}`,
    camera_cpp: `// ============================================================================
// File: TacticalDualPerspectiveCamera.cpp (Unreal Engine 5)
// TPP / FPP Smooth Spring-Arm with SphereCast Anti-Clipping against Metro Pillars
// ============================================================================

#include "TacticalDualPerspectiveCamera.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"
#include "CollisionQueryParams.h"

void ATacticalCharacter::UpdateDualCamera(float DeltaTime)
{
    const FVector HeadSocketLocation = GetMesh()->GetSocketLocation(FName("head"));
    const FRotator ControlRot = GetControlRotation();

    if (CurrentPerspective == ECameraPerspective::FPP)
    {
        // First Person: Lock camera to true eye location with 0 spring arm
        CameraBoom->TargetArmLength = FMath::FInterpTo(CameraBoom->TargetArmLength, 0.0f, DeltaTime, 15.0f);
        CameraBoom->SocketOffset = FMath::VInterpTo(CameraBoom->SocketOffset, FVector(10.0f, 0.0f, 0.0f), DeltaTime, 15.0f);
        FollowCamera->SetFieldOfView(bIsAimingADS ? 50.0f : 85.0f);
    }
    else
    {
        // Third Person Perspective (TPP): Over-the-shoulder Spring Arm
        const float TargetArm = bIsAimingADS ? 180.0f : 360.0f;
        const FVector TargetShoulderOffset = bIsAimingADS ? FVector(0.0f, 45.0f, 15.0f) : FVector(0.0f, 65.0f, 20.0f);

        CameraBoom->TargetArmLength = FMath::FInterpTo(CameraBoom->TargetArmLength, TargetArm, DeltaTime, 12.0f);
        CameraBoom->SocketOffset = FMath::VInterpTo(CameraBoom->SocketOffset, TargetShoulderOffset, DeltaTime, 12.0f);

        // Anti-Clip SphereCast against Namma Metro Concrete Pillars & BDA Walls
        FHitResult HitResult;
        FCollisionShape SphereShape = FCollisionShape::MakeSphere(18.0f);
        FCollisionQueryParams QueryParams;
        QueryParams.AddIgnoredActor(this);

        const FVector TraceStart = HeadSocketLocation;
        const FVector TraceEnd = HeadSocketLocation - (ControlRot.Vector() * CameraBoom->TargetArmLength);

        if (GetWorld()->SweepSingleByChannel(HitResult, TraceStart, TraceEnd, FQuat::Identity, ECC_Camera, SphereShape, QueryParams))
        {
            // Compress boom distance before clipping into geometry
            CameraBoom->TargetArmLength = FMath::Max(30.0f, HitResult.Distance - 10.0f);
        }

        FollowCamera->SetFieldOfView(bIsAimingADS ? 50.0f : 75.0f);
    }
}`,
    bot_bt: `// ============================================================================
// File: TacticalBotAIController.cpp (Behavior Tree & Auditory Raycasting)
// Project: Bengaluru Tactical Ops AI Engine
// ============================================================================

#include "TacticalBotAIController.h"
#include "Perception/AIPerceptionComponent.h"
#include "Perception/AISenseConfig_Hearing.h"
#include "BehaviorTree/BlackboardComponent.h"

void ATacticalBotAIController::OnHearNoise(AActor* InstigatorActor, const FVector& NoiseLocation, float Volume)
{
    if (!InstigatorActor || InstigatorActor == GetPawn()) return;

    // Raycast Line of Sight Acoustic Propagation Test
    // High walls of BDA Complex or Concrete Metro Pillars dampen sound intensity
    FHitResult HitResult;
    FCollisionQueryParams Params;
    Params.AddIgnoredActor(GetPawn());
    Params.AddIgnoredActor(InstigatorActor);

    const FVector BotEarLocation = GetPawn()->GetActorLocation() + FVector(0, 0, 160.0f);
    const bool bOccluded = GetWorld()->LineTraceSingleByChannel(HitResult, BotEarLocation, NoiseLocation, ECC_Visibility, Params);

    // Audio transmission coefficient (0.35 if concrete wall occludes, 1.0 in open air)
    const float OcclusionMultiplier = bOccluded ? 0.35f : 1.0f;
    const float EffectiveVolume = Volume * OcclusionMultiplier;

    if (EffectiveVolume >= HearingThreshold)
    {
        // Update Behavior Tree Blackboard
        Blackboard->SetValueAsVector(FName("SuspectedTargetLocation"), NoiseLocation);
        Blackboard->SetValueAsEnum(FName("TacticalState"), static_cast<uint8>(EBotState::Alert_InvestigateSound));
        
        // Orient bot heading towards sound origin
        const FRotator LookAtRot = FRotationMatrix::MakeFromX(NoiseLocation - BotEarLocation).Rotator();
        GetPawn()->SetActorRotation(FRotator(0.0f, LookAtRot.Yaw, 0.0f));
    }
}

void ATacticalBotAIController::TickZoneBehavior(const FVector& SafeZoneCenter, float BlueRadius, const FVector& BlueCenter)
{
    const FVector CurrentLocation = GetPawn()->GetActorLocation();
    const float DistToBlueCenter = FVector::Dist2D(CurrentLocation, BlueCenter);

    // If outside blue or zone closing fast, override combat to flee
    if (DistToBlueCenter > BlueRadius * 0.92f)
    {
        Blackboard->SetValueAsEnum(FName("TacticalState"), static_cast<uint8>(EBotState::ZoneFlee));
        Blackboard->SetValueAsVector(FName("Destination"), SafeZoneCenter);
        MoveToLocation(SafeZoneCenter, 200.0f, true, true, false);
    }
}`,
    osm_gis: `// ============================================================================
// File: BengaluruOSMProjectionPipeline.cs (Unity 3D / Unreal GIS Specification)
// EPSG:4326 WGS84 -> Metric Local World Coordinates Converter
// ============================================================================

using System;
using UnityEngine;

public static class BengaluruGIS
{
    // Banashankari 2nd Stage BDA Shopping Complex Origin
    public const double ORIGIN_LAT = 12.92544;
    public const double ORIGIN_LNG = 77.57531;

    // High accuracy WGS84 ellipsoid metrics for Bengaluru latitude (12.9° N)
    private const double METERS_PER_DEG_LAT = 110852.14;
    private const double METERS_PER_DEG_LNG = 108498.85;

    /// <summary>
    /// Projects raw OpenStreetMap (OSM) nodes into Engine Vector3 coordinates.
    /// Banashankari BDA Complex sits at (0, 0, 0).
    /// </summary>
    public static Vector3 ProjectOSMToWorld(double lat, double lng, float elevation = 0f)
    {
        double dLat = lat - ORIGIN_LAT;
        double dLng = lng - ORIGIN_LNG;

        float x = (float)(dLng * METERS_PER_DEG_LNG);
        float z = (float)(-dLat * METERS_PER_DEG_LAT); // North = -Z in Unity

        return new Vector3(x, elevation, z);
    }

    /// <summary>
    /// Reverse-projects world space positions to real-world GPS coordinates for HUD/Minimap.
    /// </summary>
    public static void WorldToGPS(Vector3 worldPos, out double lat, out double lng)
    {
        lat = ORIGIN_LAT - (worldPos.z / METERS_PER_DEG_LAT);
        lng = ORIGIN_LNG + (worldPos.x / METERS_PER_DEG_LNG);
    }
}`,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono select-none">
      <div className="bg-zinc-950 border border-white/20 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Top Header */}
        <div className="p-4 bg-zinc-900 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-extrabold uppercase tracking-wider text-emerald-400">
                GEO-SPATIAL GAME ARCHITECT ENGINE SUITE (UE5 / UNITY 3D)
              </h2>
              <p className="text-[11px] text-zinc-400">
                Banashankari BDA Complex Topological Battle Royale & Multi-Mode Combat Core
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-zinc-900/60 text-xs">
          {[
            { id: 'zone', label: '1. Zone Shrink Engine (C++)', icon: Layers },
            { id: 'camera', label: '2. TPP/FPP Camera (C++)', icon: Video },
            { id: 'bot_bt', label: '3. Bot Behavior Tree & Audio', icon: Bot },
            { id: 'osm_gis', label: '4. Bengaluru GIS / OSM Pipeline', icon: Compass },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 font-bold flex items-center space-x-2 border-b-2 cursor-pointer transition ${
                  activeTab === tab.id
                    ? 'border-emerald-400 text-emerald-400 bg-zinc-900'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Code Content Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0d1117] text-zinc-200 text-xs leading-relaxed">
          {activeTab === 'zone' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 font-bold">Unreal Engine 5 - BanashankariZoneManager.h / .cpp</span>
                <button
                  onClick={() => copyCode('zone', codeSnippets.zone_cpp)}
                  className="flex items-center space-x-1.5 bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-emerald-400 font-bold cursor-pointer transition"
                >
                  {copied === 'zone' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === 'zone' ? 'COPIED' : 'COPY SCRIPT'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black/60 border border-white/10 overflow-x-auto text-[11px] font-mono text-emerald-300">
                {codeSnippets.zone_cpp}
              </pre>
            </div>
          )}

          {activeTab === 'camera' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 font-bold">Unreal Engine 5 - TacticalDualPerspectiveCamera.cpp</span>
                <button
                  onClick={() => copyCode('camera', codeSnippets.camera_cpp)}
                  className="flex items-center space-x-1.5 bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-emerald-400 font-bold cursor-pointer transition"
                >
                  {copied === 'camera' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === 'camera' ? 'COPIED' : 'COPY SCRIPT'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black/60 border border-white/10 overflow-x-auto text-[11px] font-mono text-cyan-300">
                {codeSnippets.camera_cpp}
              </pre>
            </div>
          )}

          {activeTab === 'bot_bt' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 font-bold">UE5 AI Controller - Auditory Perception & Behavior Tree</span>
                <button
                  onClick={() => copyCode('bot_bt', codeSnippets.bot_bt)}
                  className="flex items-center space-x-1.5 bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-emerald-400 font-bold cursor-pointer transition"
                >
                  {copied === 'bot_bt' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === 'bot_bt' ? 'COPIED' : 'COPY SCRIPT'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black/60 border border-white/10 overflow-x-auto text-[11px] font-mono text-amber-300">
                {codeSnippets.bot_bt}
              </pre>
            </div>
          )}

          {activeTab === 'osm_gis' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 font-bold">Unity / UE5 GIS - BengaluruOSMProjectionPipeline.cs</span>
                <button
                  onClick={() => copyCode('osm_gis', codeSnippets.osm_gis)}
                  className="flex items-center space-x-1.5 bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-emerald-400 font-bold cursor-pointer transition"
                >
                  {copied === 'osm_gis' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied === 'osm_gis' ? 'COPIED' : 'COPY SCRIPT'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black/60 border border-white/10 overflow-x-auto text-[11px] font-mono text-purple-300">
                {codeSnippets.osm_gis}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <span>Production-grade C++ / C# source code ready for Unreal Engine 5.4+ and Unity 6 LTS.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold cursor-pointer transition"
          >
            RETURN TO GAME
          </button>
        </div>
      </div>
    </div>
  );
};
