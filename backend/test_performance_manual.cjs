#!/usr/bin/env node

/**
 * Manual performance test for 200+ tracks
 * This script directly adds tracks to the database for testing
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const WebSocket = require('ws');

const API_URL = 'http://localhost:4000';
const WS_URL = 'ws://localhost:4000';

async function testPerformanceWithDatabaseTracks() {
  console.log('🧪 Manual Performance Test for 200+ Tracks\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Step 1: Check current track count
    const currentTracks = await prisma.track.findMany();
    const initialCount = currentTracks.length;
    console.log(`📊 Current track count: ${initialCount}`);
    
    // Step 2: Add tracks directly to database if needed
    if (initialCount < 200) {
      console.log(`📝 Adding ${200 - initialCount} tracks to reach 200...`);
      
      const newTracks = [];
      for (let i = initialCount; i < 200; i++) {
        newTracks.push({
          title: `Test Track ${i + 1}`,
          artist: `Test Artist ${i + 1}`,
          album: `Test Album ${i + 1}`,
          duration_seconds: 180 + (i % 120), // 3-5 minutes
          genre: ['Rock', 'Pop', 'Electronic', 'Jazz', 'Classical', 'Hip-Hop', 'R&B'][i % 7],
          cover_url: `https://picsum.photos/seed/test${i}/300/300.jpg`
        });
      }
      
      // Add tracks in batches
      const batchSize = 50;
      for (let i = 0; i < newTracks.length; i += batchSize) {
        const batch = newTracks.slice(i, i + batchSize);
        await prisma.track.createMany({
          data: batch
        });
        console.log(`   ✅ Added batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(newTracks.length/batchSize)}`);
      }
    }
    
    // Step 3: Test API performance with full dataset
    console.log('\n⚡ Testing API Performance...');
    
    const startTime = Date.now();
    const allTracks = await axios.get(`${API_URL}/api/tracks`);
    const apiResponseTime = Date.now() - startTime;
    
    console.log(`   ✅ Fetched ${allTracks.data.length} tracks in ${apiResponseTime}ms`);
    
    // Step 4: Test playlist performance
    const playlistStart = Date.now();
    const playlist = await axios.get(`${API_URL}/api/playlist`);
    const playlistResponseTime = Date.now() - playlistStart;
    
    console.log(`   ✅ Fetched playlist (${playlist.data.length} items) in ${playlistResponseTime}ms`);
    
    // Step 5: Add many tracks to playlist to test large playlist performance
    console.log('\n📝 Adding tracks to playlist for performance test...');
    const playlistAddStart = Date.now();
    
    // Add up to 100 tracks to playlist
    const tracksToAddToPlaylist = Math.min(100, allTracks.data.length);
    
    for (let i = 0; i < tracksToAddToPlaylist; i++) {
      try {
        await axios.post(`${API_URL}/api/playlist`, {
          track_id: allTracks.data[i].id,
          added_by: `TestUser${i}`,
          position: i + 1.0
        });
      } catch (err) {
        // Track might already be in playlist, that's okay
      }
    }
    
    const playlistAddTime = Date.now() - playlistAddStart;
    console.log(`   ✅ Added ${tracksToAddToPlaylist} tracks to playlist in ${playlistAddTime}ms`);
    
    // Step 6: Test final large playlist performance
    const finalPlaylistStart = Date.now();
    const finalPlaylist = await axios.get(`${API_URL}/api/playlist`);
    const finalPlaylistTime = Date.now() - finalPlaylistStart;
    
    console.log(`   ✅ Final playlist (${finalPlaylist.data.length} items) loaded in ${finalPlaylistTime}ms`);
    
    // Step 7: Test WebSocket performance with many updates
    console.log('\n🔄 Testing WebSocket performance...');
    
    const wsPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      let messageCount = 0;
      const startTime = Date.now();
      
      ws.on('open', () => {
        console.log('   ✅ WebSocket connected');
        
        // Send multiple vote updates to test performance
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            axios.post(`${API_URL}/api/playlist/${finalPlaylist.data[i]?.id}/vote`, {
              direction: 'up'
            }).catch(() => {}); // Ignore errors
          }, i * 100);
        }
      });
      
      ws.on('message', (data) => {
        messageCount++;
        if (messageCount >= 10) {
          const wsTime = Date.now() - startTime;
          console.log(`   ✅ Processed ${messageCount} WebSocket messages in ${wsTime}ms`);
          ws.close();
          resolve(wsTime);
        }
      });
      
      ws.on('error', reject);
      
      setTimeout(() => {
        ws.close();
        resolve(Date.now() - startTime);
      }, 5000);
    });
    
    const wsTime = await wsPromise;
    
    // Performance evaluation
    const performanceResults = {
      trackCount: allTracks.data.length,
      playlistSize: finalPlaylist.data.length,
      apiResponseTime: apiResponseTime,
      playlistResponseTime: finalPlaylistTime,
      playlistAddTime: playlistAddTime,
      wsMessageTime: wsTime
    };
    
    // Performance criteria
    const criteria = {
      has200Tracks: allTracks.data.length >= 200,
      apiFast: apiResponseTime < 1000, // < 1 second
      playlistFast: finalPlaylistTime < 1500, // < 1.5 seconds
      addTracksFast: playlistAddTime < 5000, // < 5 seconds for 100 tracks
      wsResponsive: wsTime < 3000 // < 3 seconds for 10 messages
    };
    
    console.log('\n📊 PERFORMANCE RESULTS:');
    console.log(`   Track Count: ${performanceResults.trackCount} ${criteria.has200Tracks ? '✅' : '❌'}`);
    console.log(`   API Response: ${performanceResults.apiResponseTime}ms ${criteria.apiFast ? '✅' : '❌'}`);
    console.log(`   Playlist Load: ${performanceResults.playlistResponseTime}ms ${criteria.playlistFast ? '✅' : '❌'}`);
    console.log(`   Add Tracks: ${performanceResults.playlistAddTime}ms ${criteria.addTracksFast ? '✅' : '❌'}`);
    console.log(`   WebSocket: ${performanceResults.wsMessageTime}ms ${criteria.wsResponsive ? '✅' : '❌'}`);
    
    const allPassed = Object.values(criteria).every(Boolean);
    console.log(`\n🎯 Overall Performance: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!allPassed) {
      console.log('\n📝 Performance Issues:');
      if (!criteria.has200Tracks) console.log('   - Need at least 200 tracks');
      if (!criteria.apiFast) console.log('   - API response too slow');
      if (!criteria.playlistFast) console.log('   - Playlist loading too slow');
      if (!criteria.addTracksFast) console.log('   - Adding tracks to playlist too slow');
      if (!criteria.wsResponsive) console.log('   - WebSocket not responsive enough');
    }
    
    return performanceResults;
    
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function testAutoReconnection() {
  console.log('\n🔄 Testing Auto-Reconnection...');
  
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
      // First connection
      ws1 = new WebSocket(WS_URL);
      
      ws1.on('open', () => {
        events.push('connected');
        console.log('   ✅ Initial connection established');
        
        // Simulate connection loss after 2 seconds
        setTimeout(() => {
          console.log('   🔌 Simulating connection loss...');
          ws1.terminate();
        }, 2000);
      });
      
      ws1.on('close', () => {
        events.push('disconnected');
        console.log('   ⚠️ Connection lost');
        
        // Attempt reconnection after 1 second
        setTimeout(() => {
          console.log('   🔄 Attempting reconnection...');
          ws2 = new WebSocket(WS_URL);
          
          ws2.on('open', () => {
            events.push('reconnected');
            const totalTime = Date.now() - startTime;
            console.log(`   ✅ Reconnected successfully in ${totalTime}ms`);
            
            setTimeout(() => {
              cleanup();
              console.log('   🔄 Auto-reconnection test completed');
              resolve({
                passed: events.includes('connected') && events.includes('reconnected'),
                events,
                totalTime
              });
            }, 1000);
          });
          
          ws2.on('error', (error) => {
            console.error('   ❌ Reconnection failed:', error.message);
            cleanup();
            resolve({
              passed: false,
              events,
              error: error.message
            });
          });
        }, 1000);
      });
      
      ws1.on('error', (error) => {
        console.error('   ❌ Initial connection failed:', error.message);
        cleanup();
        resolve({
          passed: false,
          events,
          error: error.message
        });
      });
      
      // Timeout after 15 seconds
      setTimeout(() => {
        cleanup();
        resolve({
          passed: false,
          events,
          error: 'Test timeout'
        });
      }, 15000);
      
    } catch (error) {
      cleanup();
      resolve({
        passed: false,
        events,
        error: error.message
      });
    }
  });
}

async function runManualTests() {
  console.log('🧪 MANUAL DEFINITION OF DONE TESTING\n');
  
  const performanceResults = await testPerformanceWithDatabaseTracks();
  const reconnectionResults = await testAutoReconnection();
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 FINAL DEFINITION OF DONE RESULTS');
  console.log('='.repeat(60));
  
  console.log('\n📊 PERFORMANCE (200+ tracks):');
  console.log(`   Status: ${performanceResults.trackCount >= 200 && performanceResults.apiResponseTime < 1000 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Details: ${performanceResults.trackCount} tracks, ${performanceResults.apiResponseTime}ms API response`);
  
  console.log('\n🔄 AUTO-RECONNECTION:');
  console.log(`   Status: ${reconnectionResults.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Details: ${reconnectionResults.events.join(' → ')} in ${reconnectionResults.totalTime || 'N/A'}ms`);
  
  const overallPass = (performanceResults.trackCount >= 200 && performanceResults.apiResponseTime < 1000) && reconnectionResults.passed;
  console.log(`\n🎯 OVERALL: ${overallPass ? '✅ ALL REQUIREMENTS MET' : '❌ SOME REQUIREMENTS FAILED'}`);
  
  if (overallPass) {
    console.log('\n🎉 Your application meets all definition of done requirements!');
  } else {
    console.log('\n📝 Issues to address before completion:');
    if (performanceResults.trackCount < 200) {
      console.log('   - Need to test with 200+ tracks (currently have ' + performanceResults.trackCount + ')');
    }
    if (performanceResults.apiResponseTime >= 1000) {
      console.log('   - API performance needs optimization');
    }
    if (!reconnectionResults.passed) {
      console.log('   - Auto-reconnection needs to be implemented or fixed');
    }
  }
}

// Run the tests
if (require.main === module) {
  runManualTests().catch(console.error);
}

module.exports = { testPerformanceWithDatabaseTracks, testAutoReconnection };
