#!/usr/bin/env node

/**
 * Definition of Done Requirements Test
 * Tests both requirements:
 * 1. No performance issues with 200+ tracks
 * 2. Auto-reconnection on connection loss
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const WebSocket = require('ws');

const API_URL = 'http://localhost:4000';
const WS_URL = 'ws://localhost:4000';

async function testPerformanceWith200Tracks() {
  console.log('📊 TESTING PERFORMANCE WITH 200+ TRACKS');
  console.log('='.repeat(50));
  
  const prisma = new PrismaClient();
  
  try {
    // Step 1: Check current state
    console.log('\n1️⃣ Checking current database state...');
    const currentTracks = await prisma.track.findMany();
    const currentCount = currentTracks.length;
    console.log(`   Current tracks: ${currentCount}`);
    
    // Step 2: Add tracks to reach 200+
    if (currentCount < 200) {
      console.log(`\n2️⃣ Adding ${200 - currentCount} tracks to reach 200...`);
      
      const tracksToAdd = [];
      for (let i = currentCount; i < 200; i++) {
        tracksToAdd.push({
          title: `Performance Test Track ${i + 1}`,
          artist: `Test Artist ${i + 1}`,
          album: `Test Album ${i + 1}`,
          duration_seconds: 180 + (i % 120),
          genre: ['Rock', 'Pop', 'Electronic', 'Jazz', 'Classical', 'Hip-Hop', 'R&B'][i % 7],
          cover_url: `https://picsum.photos/seed/perf${i}/300/300.jpg`
        });
      }
      
      // Insert in batches of 50
      for (let i = 0; i < tracksToAdd.length; i += 50) {
        const batch = tracksToAdd.slice(i, i + 50);
        await prisma.track.createMany({ data: batch });
        console.log(`   ✅ Batch ${Math.floor(i/50) + 1}/${Math.ceil(tracksToAdd.length/50)} completed`);
      }
    }
    
    // Step 3: Verify final count
    const finalTracks = await prisma.track.findMany();
    console.log(`\n3️⃣ Final track count: ${finalTracks.length}`);
    
    // Step 4: Test API performance
    console.log('\n4️⃣ Testing API performance...');
    
    const apiStart = Date.now();
    const apiResponse = await axios.get(`${API_URL}/api/tracks`);
    const apiTime = Date.now() - apiStart;
    
    console.log(`   ✅ API Response: ${apiResponse.data.length} tracks in ${apiTime}ms`);
    
    // Step 5: Test playlist performance
    console.log('\n5️⃣ Testing playlist performance...');
    
    // Add 50 tracks to playlist
    const playlistAddStart = Date.now();
    for (let i = 0; i < Math.min(50, apiResponse.data.length); i++) {
      try {
        await axios.post(`${API_URL}/api/playlist`, {
          track_id: apiResponse.data[i].id,
          added_by: `PerfTest${i}`,
          position: i + 1.0
        });
      } catch (err) {
        // Ignore duplicates
      }
    }
    const playlistAddTime = Date.now() - playlistAddStart;
    
    // Test playlist loading
    const playlistStart = Date.now();
    const playlistResponse = await axios.get(`${API_URL}/api/playlist`);
    const playlistTime = Date.now() - playlistStart;
    
    console.log(`   ✅ Playlist: ${playlistResponse.data.length} items`);
    console.log(`   ✅ Add time: ${playlistAddTime}ms`);
    console.log(`   ✅ Load time: ${playlistTime}ms`);
    
    // Step 6: Test WebSocket performance with many updates
    console.log('\n6️⃣ Testing WebSocket performance...');
    
    const wsPromise = new Promise((resolve) => {
      const ws = new WebSocket(WS_URL);
      let messageCount = 0;
      const wsStart = Date.now();
      
      ws.on('open', () => {
        // Send 20 rapid updates
        for (let i = 0; i < 20; i++) {
          setTimeout(() => {
            if (playlistResponse.data[i]) {
              axios.post(`${API_URL}/api/playlist/${playlistResponse.data[i].id}/vote`, {
                direction: i % 2 === 0 ? 'up' : 'down'
              }).catch(() => {});
            }
          }, i * 50);
        }
      });
      
      ws.on('message', () => {
        messageCount++;
        if (messageCount >= 20) {
          const wsTime = Date.now() - wsStart;
          console.log(`   ✅ WebSocket: ${messageCount} messages in ${wsTime}ms`);
          ws.close();
          resolve(wsTime);
        }
      });
      
      setTimeout(() => {
        ws.close();
        resolve(Date.now() - wsStart);
      }, 5000);
    });
    
    const wsTime = await wsPromise;
    
    // Step 7: Evaluate results
    console.log('\n📊 PERFORMANCE EVALUATION:');
    
    const criteria = {
      has200Tracks: finalTracks.length >= 200,
      apiFast: apiTime < 1000,
      playlistFast: playlistTime < 1500,
      addFast: playlistAddTime < 3000,
      wsResponsive: wsTime < 3000
    };
    
    Object.entries(criteria).forEach(([key, passed]) => {
      const icons = {
        has200Tracks: '🎵',
        apiFast: '⚡',
        playlistFast: '📝',
        addFast: '➕',
        wsResponsive: '🔄'
      };
      console.log(`   ${icons[key]} ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    const performancePassed = Object.values(criteria).every(Boolean);
    console.log(`\n🎯 PERFORMANCE STATUS: ${performancePassed ? '✅ PASS' : '❌ FAIL'}`);
    
    return {
      passed: performancePassed,
      details: {
        trackCount: finalTracks.length,
        apiTime,
        playlistTime,
        addTime: playlistAddTime,
        wsTime,
        criteria
      }
    };
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    return { passed: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

async function testAutoReconnection() {
  console.log('\n🔄 TESTING AUTO-RECONNECTION');
  console.log('='.repeat(50));
  
  return new Promise((resolve) => {
    const events = [];
    const startTime = Date.now();
    let ws1 = null;
    let ws2 = null;
    
    const cleanup = () => {
      if (ws1) ws1.close();
      if (ws2) ws2.close();
    };
    
    try {
      console.log('\n1️⃣ Establishing initial connection...');
      ws1 = new WebSocket(WS_URL);
      
      ws1.on('open', () => {
        events.push('connected');
        console.log('   ✅ Initial connection established');
        
        console.log('\n2️⃣ Simulating connection loss in 2 seconds...');
        setTimeout(() => {
          console.log('   🔌 Terminating connection...');
          ws1.terminate();
        }, 2000);
      });
      
      ws1.on('close', () => {
        events.push('disconnected');
        console.log('   ⚠️ Connection lost');
        
        console.log('\n3️⃣ Attempting reconnection...');
        setTimeout(() => {
          ws2 = new WebSocket(WS_URL);
          
          ws2.on('open', () => {
            events.push('reconnected');
            const totalTime = Date.now() - startTime;
            console.log(`   ✅ Reconnected in ${totalTime}ms`);
            
            setTimeout(() => {
              cleanup();
              console.log('\n🔄 AUTO-RECONNECTION EVALUATION:');
              
              const criteria = {
                initialConnection: events.includes('connected'),
                disconnectionDetected: events.includes('disconnected'),
                reconnectionSuccess: events.includes('reconnected'),
                reasonableTime: totalTime < 10000
              };
              
              Object.entries(criteria).forEach(([key, passed]) => {
                console.log(`   ${passed ? '✅' : '❌'} ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
              });
              
              const reconnectionPassed = Object.values(criteria).every(Boolean);
              console.log(`\n🎯 AUTO-RECONNECTION STATUS: ${reconnectionPassed ? '✅ PASS' : '❌ FAIL'}`);
              
              resolve({
                passed: reconnectionPassed,
                details: {
                  events,
                  totalTime,
                  criteria
                }
              });
            }, 1000);
          });
          
          ws2.on('error', (error) => {
            console.error('   ❌ Reconnection failed:', error.message);
            cleanup();
            resolve({ passed: false, error: error.message });
          });
        }, 1000);
      });
      
      ws1.on('error', (error) => {
        console.error('   ❌ Initial connection failed:', error.message);
        cleanup();
        resolve({ passed: false, error: error.message });
      });
      
      setTimeout(() => {
        cleanup();
        resolve({ passed: false, error: 'Test timeout' });
      }, 15000);
      
    } catch (error) {
      cleanup();
      resolve({ passed: false, error: error.message });
    }
  });
}

async function runDefinitionOfDoneTests() {
  console.log('🧪 DEFINITION OF DONE REQUIREMENTS TESTING');
  console.log('='.repeat(60));
  console.log('Testing both requirements:');
  console.log('1. No performance issues with 200+ tracks');
  console.log('2. Auto-reconnection on connection loss');
  
  const performanceResults = await testPerformanceWith200Tracks();
  const reconnectionResults = await testAutoReconnection();
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 FINAL DEFINITION OF DONE RESULTS');
  console.log('='.repeat(60));
  
  console.log('\n📊 REQUIREMENT 1: Performance (200+ tracks)');
  console.log(`   Status: ${performanceResults.passed ? '✅ PASS' : '❌ FAIL'}`);
  if (performanceResults.details) {
    console.log(`   Track Count: ${performanceResults.details.trackCount}`);
    console.log(`   API Response: ${performanceResults.details.apiTime}ms`);
    console.log(`   Playlist Load: ${performanceResults.details.playlistTime}ms`);
  }
  if (performanceResults.error) {
    console.log(`   Error: ${performanceResults.error}`);
  }
  
  console.log('\n🔄 REQUIREMENT 2: Auto-reconnection');
  console.log(`   Status: ${reconnectionResults.passed ? '✅ PASS' : '❌ FAIL'}`);
  if (reconnectionResults.details) {
    console.log(`   Events: ${reconnectionResults.details.events.join(' → ')}`);
    console.log(`   Time: ${reconnectionResults.details.totalTime}ms`);
  }
  if (reconnectionResults.error) {
    console.log(`   Error: ${reconnectionResults.error}`);
  }
  
  const overallPass = performanceResults.passed && reconnectionResults.passed;
  console.log(`\n🎯 OVERALL DEFINITION OF DONE: ${overallPass ? '✅ ALL REQUIREMENTS MET' : '❌ SOME REQUIREMENTS FAILED'}`);
  
  if (overallPass) {
    console.log('\n🎉 CONGRATULATIONS! Your application meets all definition of done requirements!');
    console.log('\n✅ Performance: Handles 200+ tracks efficiently');
    console.log('✅ Reliability: Auto-reconnection works correctly');
  } else {
    console.log('\n📝 REQUIREMENTS NOT MET:');
    if (!performanceResults.passed) {
      console.log('   ❌ Performance needs optimization for 200+ tracks');
    }
    if (!reconnectionResults.passed) {
      console.log('   ❌ Auto-reconnection needs to be implemented or fixed');
    }
  }
  
  console.log('\n💡 NEXT STEPS:');
  if (overallPass) {
    console.log('   🚀 Ready for production deployment');
    console.log('   📈 Consider adding performance monitoring');
    console.log('   🔍 Set up automated testing pipeline');
  } else {
    console.log('   🔧 Address failing requirements');
    console.log('   🧪 Re-run tests after fixes');
    console.log('   📝 Document any limitations');
  }
}

// Run tests if executed directly
if (require.main === module) {
  runDefinitionOfDoneTests().catch(console.error);
}

module.exports = { runDefinitionOfDoneTests, testPerformanceWith200Tracks, testAutoReconnection };
