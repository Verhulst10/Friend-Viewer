let fetchQueue = [];

setInterval( () => {
   if (fetchQueue.length === 0) return;
   const [url, resolve, reject] = fetchQueue.shift();

   fetch(url, { credentials: "include" }).then(async (response) => {
      if (response.status === 429 || !response.ok) {

         if (response.status === 429) {
            await new Promise((resolve) => setTimeout(() => resolve(), 500));
         }

         fetchQueue.push([url, resolve, reject]);
      } else {
         resolve(response);
      } 
   }).catch((reason) => {
      reject(reason);
   })
}, 250);

async function queue(url) {
   return new Promise((resolve, reject) => {
      fetchQueue.push([url, resolve, reject]);
   });
}

const groups = {};
const groupTags = [];

setInterval(async () => {
   for (const group of [...groupTags]) {
      const bundle = groups[group];
      const resolves = {};
      const rejects = {};
      const inputs = [];

      for (const object of bundle) {
         inputs.push(object[0]);
         resolves[object[0]] = object[1];
         rejects[object[0]] = object[2];
      }

      const result = await (await queue('https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + inputs.join(',') + '&size=150x150&format=webp&isCircular=true')).json();

      for (const res of result.data) {
         resolves[res.targetId.toString()](res.imageUrl);
      }

      delete groups[group];
      groupTags.splice(groupTags.indexOf(group), 1);
   }
}, 1000);


async function bundle(input, group) {
   if (!groups[group]) {
      groupTags.push(group);
      groups[group] = [];
   }

   return new Promise((resolve, reject) => {
      groups[group].push([input, resolve, reject]);
   });
}

async function renderFriend(user, ul) {
   let userData = sessionStorage.getItem('user-' + user.id);

   if (!userData) {
      userData = await queue('https://users.roblox.com/v1/users/' + user.id).then(response => response.json());
      sessionStorage.setItem('user-' + user.id, JSON.stringify(userData));
   } else {
      userData = JSON.parse(userData);
   }
   
   const isBanned = userData ? userData.isBanned : false;

   let li = document.createElement('li');
   li.setAttribute('id', user.id);
   li.setAttribute('class', 'list-item avatar-card');

   let div = document.createElement('div');
   if (isBanned) {
      div.setAttribute('class', 'avatar-card-container disabled');
   } else {
      div.setAttribute('class', 'avatar-card-container');
   }

   li.appendChild(div);

   let div2 = document.createElement('div');
   div2.setAttribute('class', 'avatar-card-content');

   div.appendChild(div2);

   let avatarDiv = document.createElement('div');
   avatarDiv.setAttribute('class', 'avatar avatar-card-fullbody');
   avatarDiv.setAttribute('data-testid', 'avatar-card-container');

   div2.appendChild(avatarDiv);

   let a = document.createElement('a');
   a.setAttribute('href', '/users/' + user.id + '/profile');
   a.setAttribute('class', 'avatar-card-link');
   a.setAttribute('data-testid', 'avatar-card-link');

   avatarDiv.appendChild(a);

   let span = document.createElement('span');
   if (isBanned) {
      span.setAttribute('class', 'thumbnail-2d-container icon-blocked avatar-card-image');
   } else {
      span.setAttribute('class', 'thumbnail-2d-container avatar-card-image');
   }

   a.appendChild(span);

   let headshot;

   let i = 0;

   async function helper() {
      try {
         let response = await bundle(user.id, 'friends-thumbnails');

         headshot = await response;
      } catch {
         if (i < 3) {
            i++;
            helper();
         }
      };
   }

   let inStorage = sessionStorage.getItem('avatar-' + user.id);

   if (!inStorage) {
      await helper();
      if (headshot && await headshot.length > 0) {
         sessionStorage.setItem('avatar-' + user.id, headshot);
      }
   } else {
      headshot = inStorage;
   }

   if (headshot && headshot.length === 0) {
      span.setAttribute('class', 'thumbnail-2d-container icon-blocked avatar-card-image');
   } else {
      let img = document.createElement('img');

      if (headshot) {
         img.src = headshot;
      } else {
         img.src = "https://tr.rbxcdn.com/180DAY-b8f65b49f59330211af67cb1d6d56f60/420/420/Image/Png/noFilter";
      }

      span.appendChild(img);
   }

   let acc = document.createElement('div');
   acc.setAttribute('class', 'avatar-card-caption');

   div2.appendChild(acc);

   let span2 = document.createElement('span');

   acc.appendChild(span2);

   let anc = document.createElement('div');
   anc.setAttribute('class', 'avatar-name-container');

   span2.appendChild(anc);

   if (isBanned) {
      let bannedDiv = document.createElement('div');
      bannedDiv.setAttribute('class', 'text-overflow avatar-name');
      bannedDiv.innerText = 'Account Deleted';

      span2.appendChild(bannedDiv);
   } else {
      let a2 = document.createElement('a');
      a2.setAttribute('href', '/users/' + user.id + '/profile');
      a2.setAttribute('class', 'text-overflow avatar-name');
      a2.innerText = userData.displayName;

      span2.appendChild(a2);
   }

   let acl = document.createElement('div');
   acl.setAttribute('class', 'avatar-card-label');
   if (isBanned) {
      acl.innerText = '@Account Deleted';
   } else {
      acl.innerText = '@' + userData.name;
   }

   span2.appendChild(acl);

   ul.appendChild(li);
}

let listing = false;

async function listFriends(data, page) {
   let ul = document.querySelector('.avatar-cards');

   if (!ul) {
      ul = document.createElement('ul');
      ul.setAttribute('class', 'hlist avatar-cards');

      let FCS = document.querySelector('.friends-content');
      FCS.appendChild(ul);
   }

   let pageIdx = page - 1;

   ul.innerHTML = '';

   for (let i = 0; i < page * 18 && i < data.length; i++) {
      if (i == 0) {
         i = pageIdx * 18;
      }

      const user = data[i];

      if (listing) {
         await renderFriend(user, ul);
      } else {
         return;
      }
   }

   listing = false;
}

function dispatchNavigationController(data) {
   let page = 1;
   let pages = Math.ceil(data.length / 18);

   let tabpanel = document.querySelector('.tab-pane');

   let pagerHolder = document.createElement('div');
   pagerHolder.setAttribute('class', 'pager-holder');

   let pager = document.createElement('ul');
   pager.setAttribute('class', 'pager');

   pagerHolder.appendChild(pager);

   let li1 = document.createElement('li');
   li1.setAttribute('class', 'pager-prev');

   let btn1 = document.createElement('button');
   btn1.setAttribute('class', 'btn-generic-left-sm');
   btn1.setAttribute('disabled', '');
   btn1.setAttribute('title', 'left');

   let span1 = document.createElement('span');
   span1.setAttribute('class', 'icon-left');

   btn1.appendChild(span1);

   li1.appendChild(btn1);

   pager.appendChild(li1);

   let li2 = document.createElement('li');
   li2.setAttribute('class', 'pager-cur');

   let span2 = document.createElement('span');
   span2.setAttribute('id', 'rbx-current-page');
   span2.innerText = page;

   li2.appendChild(span2);

   pager.appendChild(li2);

   let li3 = document.createElement('li');
   li3.setAttribute('class', 'pager-next');

   let btn3 = document.createElement('button');
   btn3.setAttribute('class', 'btn-generic-right-sm');
   btn3.setAttribute('title', 'right');

   let span3 = document.createElement('span');
   span3.setAttribute('class', 'icon-right');

   btn3.appendChild(span3);

   li3.appendChild(btn3);

   pager.appendChild(li3);
   
   tabpanel.appendChild(pagerHolder);

   btn1.onclick = function() {
      listing = false;

      if (page !== 1) {
         listing = true;
         page -= 1;
         listFriends(data, page);
         btn3.removeAttribute('disabled');

         if (page === 1) {
            btn1.setAttribute('disabled', '');
         }

         span2.innerText = page;
      }
   };

   btn3.onclick = function() {
      listing = false;

      if (page !== pages) {
         listing = true;
         page += 1;
         listFriends(data, page);
         btn1.removeAttribute('disabled');

         if (page === pages) {
            btn3.setAttribute('disabled', '');
         }

         span2.innerText = page;
      }
   };
}

function getUrlFromNameAndId(id, name) {
   return `https://www.roblox.com/communities/${id}/${name.replace(/[^A-Za-z0-9 ]/g, '').replace(/ +/g, '-')}`;
}

async function fetchGroupData(id) {
   console.time('group load')
   let construct = [];
   const groupApiResponse = await queue(`https://groups.roblox.com/v2/users/${id}/groups/roles?includeLocked=true&includeNotificationPreferences=false&discoveryType=0`).then((response) => response.json());

   const groupIds = groupApiResponse.data.map(item => item.group.id);
   const batchSize = 20;
   const images = {};
   const descriptions = {};

   for (let i = 0; i < groupIds.length; i += batchSize) {
      const batch = groupIds.slice(i, i + batchSize);
      const thumbnailApiResponse = await queue(
         `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${batch.join(',')}&size=420x420&format=Png&isCircular=false`
      ).then((response) => response.json());
      const groupInfoApiResponse = await queue(
         `https://groups.roblox.com/v2/groups?groupIds=${batch.join(',')}`
      ).then((response) => response.json());

      for (const img of thumbnailApiResponse.data) {
         images[img.targetId] = img.imageUrl;
      }

      for (const group of groupInfoApiResponse.data) {
         descriptions[group.id] = group.description;
      }
   }

   for (const group of groupApiResponse.data) {
      construct.push({
         'id': group.group.id,
         'name': group.group.name,
         'memberCount': group.group.memberCount,
         'role': group.role.name,
         'url': getUrlFromNameAndId(group.group.id, group.group.name),
         'imageUrl': images[group.group.id],
         'verified': group.group.hasVerifiedBadge,
         'description': descriptions[group.group.id],
      });
   }

   console.timeEnd('group load')

   return construct;
}

function abbreviateMemberCount(count) {
   if (count < 1e3) {
      return count;
   } else if (count >= 1e3 && count < 1e6) {
      return Math.floor(count / 1e3) + 'K+';
   } else if (count >= 1e6 && count < 1e9) {
      return Math.floor(count / 1e6) + 'M+';
   } else if (count >= 1e9 && count < 1e12) {
      return Math.floor(count / 1e9) + 'B+';
   }  else if (count >= 1e12 && count < 1e15) {
      return Math.floor(count / 1e12) + 'T+';
   } else {
      return count;
   }
}

async function addSlideshowGroups(ul, id) {
   const data = await fetchGroupData(id);

   for (let i = 0; i < data.length; i++) {
      const groupData = data[i];

      const li = document.createElement('li');

      if (i === 0) {
         li.className = 'switcher-item slide-item-container ng-scope active';
      } else {
         li.className = 'switcher-item slide-item-container ng-scope ng-hide';
      }

      li.setAttribute('ng-repeat', 'group in groups');
      li.setAttribute('ng-show', 'shouldPreLoad($index)');
      li.setAttribute('ng-class', "{'active': curIdx === $index}");

      const div = document.createElement('div');
      div.className = 'col-sm-6 slide-item-container-left';

      const emblemContainer = document.createElement('div');
      emblemContainer.className = 'slide-item-emblem-container';

      const a = document.createElement('a');
      a.setAttribute('ng-href', groupData.url);
      a.href = groupData.url;

      const thumbnail = document.createElement('thumbnail-2d');
      thumbnail.className = 'slide-item-image ng-isolate-scope';
      thumbnail.setAttribute('thumbnail-type', 'thumbnailTypes.groupIcon');
      thumbnail.setAttribute('thumbnail-target-id', 'group.id');
      thumbnail.setAttribute('thumbnail-options', 'thumbnailOptions');

      const span = document.createElement('span');
      span.className = 'thumbnail-2d-container';
      span.setAttribute('ng-class', '$ctrl.getCssClasses()');
      span.setAttribute('thumbnail-type', 'GroupIcon');
      span.setAttribute('thumbnail-target-id', groupData.id);

      const img = document.createElement('img');
      img.setAttribute('ng-if', '$ctrl.thumbnailUrl && $ctrl.isLazyLoadingEnabled()');
      img.setAttribute('lazy-img', groupData.imageUrl);
      img.setAttribute('thumbnail-error', '$ctrl.setThumbnailLoadFailed');
      img.className = 'ng-scope ng-isolate-scope';
      img.src = groupData.imageUrl;

      span.appendChild(img);
      thumbnail.appendChild(span);
      a.appendChild(thumbnail);
      emblemContainer.appendChild(a);
      div.appendChild(emblemContainer);
      li.appendChild(div);

      const div2 = document.createElement('div');
      div2.className = 'col-sm-6 text-overflow slide-item-container-right groups';

      const slideItemInfo = document.createElement('div');
      slideItemInfo.className = 'slide-item-info';

      let url = getUrlFromNameAndId(groupData.id, groupData.name);

      const a2 = document.createElement('a');
      a2.setAttribute('ng-class', `${groupData.verified} ? 'group-title-with-badges' : ''`);
      a2.setAttribute('ng-href', url);
      a2.setAttribute('href', url);

      const div3 = document.createElement('div');
      div3.setAttribute('ng-class', `${groupData.verified} ? 'truncate-with-verified-badge slide-item-name text-overflow groups font-title' : 'slide-item-name text-overflow groups font-title'`);
      div3.setAttribute('ng-bind', "group.name");
      div3.className = "ng-binding slide-item-name text-overflow groups font-title";
      div3.textContent = groupData.name;

      a2.appendChild(div3);

      const span2 = document.createElement('span');
      span2.setAttribute('ng-class', `${groupData.verified} ? 'verified-badge-icon-group-carousel' : 'hidden'`);
      span2.setAttribute('data-size', "Title");
      span2.setAttribute('data-additionalimgclass', "verified-badge-icon-group-carousel-rendered");
      span2.setAttribute('data-disablemodal', "");
      span2.className = "hidden";

      a2.appendChild(span2);
      slideItemInfo.appendChild(a2);
      div2.appendChild(slideItemInfo);

      const p = document.createElement('p');
      p.className = "text-description slide-item-description groups ng-binding";
      p.setAttribute('ng-bind', 'group.description');
      p.innerText = groupData.description;

      slideItemInfo.appendChild(p);

      const slideItemStats = document.createElement('div');
      slideItemStats.className = 'slide-item-stats';

      const li2 = document.createElement('li');
      li2.className = 'list-item';

      const liDiv1 = document.createElement('div');
      liDiv1.className = 'text-label slide-item-stat-title ng-binding';
      liDiv1.setAttribute('ng-bind', "'Heading.Members' | translate");
      liDiv1.innerText = 'Members';

      li2.appendChild(liDiv1);

      const liDiv2 = document.createElement('div');
      liDiv2.className = 'text-lead group-members-count ng-binding';
      liDiv2.setAttribute('ng-bind', "group.members | abbreviate");
      liDiv2.innerText = abbreviateMemberCount(groupData.memberCount);

      li2.appendChild(liDiv2);
      slideItemStats.appendChild(li2);

      const li3 = document.createElement('li');
      li3.className = 'list-item';

      const liDiv3 = document.createElement('div');
      liDiv3.className = 'text-label slide-item-stat-title ng-binding';
      liDiv3.setAttribute('ng-bind', "'Heading.Rank' | translate");
      liDiv3.innerText = 'Rank';

      li3.appendChild(liDiv3);

      const liDiv4 = document.createElement('div');
      liDiv4.className = 'text-lead text-overflow group-rank groups ng-binding';
      liDiv4.setAttribute('ng-bind', "group.role.name");
      liDiv4.innerText = groupData.role;

      li3.appendChild(liDiv4);
      slideItemStats.appendChild(li3);
      div2.appendChild(slideItemStats);
      li.appendChild(div2);
      ul.appendChild(li);
   }

   return data.length;
}

async function addGridGroups(ul, amount, offset, data) {
   if (offset + amount < data.length) {
      return false;
   }

   for (let i = offset; i < offset + amount; i++) {
      const group = data[i];

      const li  = document.createElement('li');
      li.className = 'list-item group-container shown ng-scope';
      li.setAttribute('ng-repeat', 'group in $ctrl.groups');

      const groupsShowcaseCard = document.createElement('groups-showcase-card');
      groupsShowcaseCard.setAttribute('group', 'group');
      groupsShowcaseCard.className = 'ng-isolate-scope';

      const gameCard = document.createElement('div');
      gameCard.className = 'game-card';

      const gameCardThumbContainer = document.createElement('div');
      gameCardThumbContainer.className = 'game-card-thumb-container';

      const thumbnail = document.createElement('thumbnail-2d');
      thumbnail.className = 'slide-item-image ng-isolate-scope';
      thumbnail.setAttribute('thumbnail-type', '$ctrl.thumbnailTypes.groupIcon');
      thumbnail.setAttribute('thumbnail-target-id', '$ctrl.group.id');
      thumbnail.setAttribute('thumbnail-options', '$ctrl.thumbnailOptions');

      const span = document.createElement('span');
      span.setAttribute('ng-class', '$ctrl.getCssClasses()');
      span.className = 'thumbnail-2d-container';
      span.setAttribute('thumbnail-type', 'GroupIcon');
      span.setAttribute('thumbnail-target-id', group.id);

      const img = document.createElement('img');
      img.setAttribute('ng-if', '$ctrl.thumbnailUrl && $ctrl.isLazyLoadingEnabled()');
      img.setAttribute('lazy-img', group.imageUrl);
      img.setAttribute('thumbnail-error', '$ctrl.setThumbnailLoadFailed');
      img.className = 'ng-scope ng-isolate-scope icon-placeholder-game';
      img.src = group.imageUrl;

      span.appendChild(img);
      thumbnail.appendChild(span);
      gameCardThumbContainer.appendChild(thumbnail);
      gameCard.appendChild(gameCardThumbContainer);

      const gameCardNameContainer = document.createElement('div');
      gameCardNameContainer.className = 'game-card-name-container';

      const div = document.createElement('div');
      div.className = 'text-overflow game-card-name ng-binding';
      div.title = group.name;
      div.setAttribute('ng-bind', '$ctrl.group.name');
      div.innerText = group.name;

      gameCardNameContainer.appendChild(div);
      gameCard.appendChild(gameCardNameContainer);

      const div2 = document.createElement('div');
      div2.setAttribute('ng-bind', "'Label.MembersCount' | translate:{ memberCount: $ctrl.group.members }");
      div2.className = 'text-overflow game-card-name-secondary ng-binding';
      div2.innerText = group.memberCount.toString().toLocaleString('en-US') + ' Members';

      gameCard.appendChild(div2);

      const div3 = document.createElement('div');
      div3.className = 'text-overflow game-card-name-secondary ng-binding';
      div3.setAttribute('ng-bind', '$ctrl.group.role.name');
      div3.innerText = group.role;

      gameCard.appendChild(div3);
      groupsShowcaseCard.appendChild(gameCard);
      li.appendChild(groupsShowcaseCard);
      ul.appendChild(li);
   }

   return true;
}

let baseUrl = null;

try {
   baseUrl = window.location.href.split('/').filter(val => val !== '');
} catch {}

async function fetchAllFriends(userId) {
   let allFriends = [];
   let cursor = '';

   while (true) {
      let url = `https://friends.roblox.com/v1/users/${userId}/friends/search?limit=50`;
      
      if (cursor.length > 0) {
         url += '&cursor=' + cursor;
      }

      const response = await queue(url);
      const json = await response.json();

      allFriends.push(json.PageItems);

      if (!json.NextCursor) break;
      cursor = json.NextCursor;
   }

   return allFriends;
}

if (baseUrl !== null) {
   (async () => {
      if (baseUrl[4].split('?')[0] == 'profile') {
         await new Promise(resolve => setTimeout(resolve, 2000));

         if (document.querySelector('.profile-header-social-count').getAttribute('tabIndex') == '-1') {
            document.querySelector('.profile-header-social-count').removeAttribute('style');
            document.querySelector('.profile-header-social-count-label').innerText = "Connections (Injected)";
         }

         const showcase = Array.from(document.querySelectorAll('.groups-showcase')).find(el => {
            const parent = el.parentElement;
            const returnValue = parent && !parent.classList.contains('tab-pane');
            if (!returnValue && parent.contains(el)) parent.removeChild(el);
            return returnValue;
         });

         if (!showcase) {
            const parentDiv = document.querySelector('.profile-tab-content');
            const contentDiv = document.createElement('div');

            let currentIdx = 0;

            const div = document.createElement('div');
            div.setAttribute('groups-showcase', '');
            div.setAttribute('display-user-id', baseUrl[3]);
            div.className = 'groups-showcase ng-isolate-scope';

            const div2 = document.createElement('div');

            div2.setAttribute('ng-if', '!metadata.areProfileGroupsHidden');
            div2.setAttribute(
               'ng-class',
               "{'section': !layout.isGridOn, 'container-list': layout.isGridOn}"
            );
            div2.setAttribute('ng-show', 'groups.length > 0');

            div2.className = 'ng-scope section';

            const containerHeader = document.createElement('div');
            containerHeader.className = "container-header";

            const h2 = document.createElement('h2');
            h2.setAttribute('ng-bind', "'Heading.Groups' | translate");
            h2.className = 'ng-binding';
            h2.textContent = 'Communities (Injected)';

            const containerButtons = document.createElement('div');
            containerButtons.className = "container-buttons";

            const button = document.createElement('button');
            button.className = 'profile-view-selector btn-secondary-xs btn-generic-slideshow-xs';
            button.setAttribute('title', 'Slideshow View');
            button.setAttribute('type', 'button');
            button.setAttribute('ng-click', 'updateDisplay(false)');
            button.setAttribute(
               'ng-class',
               "{'btn-secondary-xs btn-generic-slideshow-xs': !layout.isGridOn, 'btn-control-xs btn-generic-slideshow-xs': layout.isGridOn}"
            );

            const span = document.createElement('span');
            span.className = 'icon-slideshow selected';
            span.setAttribute('ng-class', "{'selected': !layout.isGridOn}");

            button.appendChild(span);

            const button2 = document.createElement('button');
            button2.className = 'profile-view-selector btn-control-xs btn-generic-grid-xs';
            button2.setAttribute('title', 'Grid View');
            button2.setAttribute('type', 'button');
            button2.setAttribute('ng-click', 'updateDisplay(true)');
            button2.setAttribute(
               'ng-class',
               "{'btn-secondary-xs btn-generic-grid-xs': layout.isGridOn, 'btn-control-xs btn-generic-grid-xs': !layout.isGridOn}"
            );

            const span2 = document.createElement('span');
            span2.className = 'icon-grid';
            span2.setAttribute('ng-class', "{'selected': layout.isGridOn}");

            button2.appendChild(span2);

            containerButtons.appendChild(button);

            containerButtons.appendChild(button2);
            div2.appendChild(containerButtons);
            div2.appendChild(h2);
            div.appendChild(div2);

            const div3 = document.createElement('div');
            div3.className = "profile-slide-container section-content remove-panel";

            const grid = document.createElement('groups-showcase-grid');
            grid.setAttribute('groups-cache', 'groups');
            grid.setAttribute('ng-show', 'layout.isGridOn');
            grid.className = 'ng-isolate-scope ng-hide';

            const ul = document.createElement('ul');
            ul.className = 'hlist game-cards group-list';
            ul.setAttribute('horizontal-scroll-bar', '$ctrl.loadMoreGroups()');

            const groupData = await fetchGroupData(baseUrl[3]);

            addGridGroups(ul, 12, 0, groupData);
            let loadedCount = 1;

            const a = document.createElement('a');
            a.setAttribute('ng-click', '$ctrl.loadMoreGroups()');
            a.id = 'groups-load-more';
            a.className = 'btn btn-control-xs load-more-button ng-binding';
            a.setAttribute('ng-bind', "'Label.LoadMore' | translate");
            a.setAttribute('ng-show', '$ctrl.layout.canLoadMore');
            a.textContent = 'Load More';

            grid.appendChild(ul);
            grid.appendChild(a);
            div3.appendChild(grid);


            a.addEventListener('click', function(ev) {
               ev.preventDefault();
               let success = addGridGroups(ul, 12, 12 * loadedCount, groupData, a);

               if (!success) {
                  grid.removeChild(a);
               }

               loadedCount += 1;
            });

            const slideshowDiv = document.createElement('div');
            slideshowDiv.id = 'groups-switcher';
            slideshowDiv.className = 'switcher slide-switcher groups ng-isolate-scope';
            slideshowDiv.setAttribute('groups-showcase-switcher', '');
            slideshowDiv.setAttribute('groups', 'groups');
            slideshowDiv.setAttribute('ng-hide', 'layout.isGridOn');

            const ul2 = document.createElement('ul');
            ul2.className = 'slide-items-container switcher-items hlist';

            const count = await addSlideshowGroups(ul2, baseUrl[3]);

            slideshowDiv.appendChild(ul2);

            const a2 = document.createElement('a');
            a2.className = 'carousel-control left ng-scope';
            a2.setAttribute('ng-if', 'multipleItems()');
            a2.setAttribute('ng-click', 'slidePrev()');

            a2.addEventListener('click', (ev) => {
               ev.preventDefault();
               currentIdx = (currentIdx - 1);
               ul2.children[currentIdx + 1].className = 'switcher-item slide-item-container ng-scope ng-hide';

               if (currentIdx < 0) {
                  currentIdx = count - 1;
               }

               ul2.children[currentIdx].className = 'switcher-item slide-item-container ng-scope active';
            });

            const span3 = document.createElement('span');
            span3.className = 'icon-carousel-left';
            a2.appendChild(span3);

            slideshowDiv.appendChild(a2);

            const a3 = document.createElement('a');
            a3.className = 'carousel-control right ng-scope';
            a3.setAttribute('ng-if', 'multipleItems()');
            a3.setAttribute('ng-click', 'slideNext()');

            a3.addEventListener('click', (ev) => {
               ev.preventDefault();
               currentIdx = (currentIdx + 1);
               ul2.children[currentIdx - 1].className = 'switcher-item slide-item-container ng-scope ng-hide';

               if (currentIdx >= count) {
                  currentIdx = 0;
               }

               ul2.children[currentIdx].className = 'switcher-item slide-item-container ng-scope active';
            });

            const span4 = document.createElement('span');
            span4.className = 'icon-carousel-right';
            a3.appendChild(span4);

            slideshowDiv.appendChild(a3);

            div3.appendChild(slideshowDiv);

            div.appendChild(div3);

            button.onclick = function(ev) {
               ev.preventDefault();
               grid.className = 'ng-isolate-scope ng-hide';
               slideshowDiv.className = 'switcher slide-switcher groups ng-isolate-scope';
               span.className = 'icon-slideshow selected';
               span2.className = 'icon-grid';
               button.className = 'profile-view-selector btn-secondary-xs btn-generic-slideshow-xs';
               button2.className = 'profile-view-selector btn-control-xs btn-generic-slideshow-xs';
            };

            button2.onclick = function(ev) {
               ev.preventDefault();
               grid.className = 'ng-isolate-scope';
               slideshowDiv.className = 'switcher slide-switcher groups ng-isolate-scope ng-hide';
               span.className = 'icon-slideshow';
               span2.className = 'icon-grid selected';
               button.className = 'profile-view-selector btn-control-xs btn-generic-slideshow-xs';
               button2.className = 'profile-view-selector btn-secondary-xs btn-generic-slideshow-xs';
            };


            contentDiv.appendChild(div);
            parentDiv.insertBefore(contentDiv, parentDiv.children[5]);
         }
      } else if (baseUrl[5].split('?')[0] == 'friends') {
         let item = sessionStorage.getItem('friends-' + baseUrl[3]);
      
         if (!item) {
               setTimeout(async () => {
                  let data = (await fetchAllFriends(baseUrl[3])).flat();
                  if (data.length > 0) {
                     let ul = document.querySelector('.avatar-cards');
                     
                     if (!ul) {
                        document.querySelector('.friends-content').removeChild(document.querySelector('.section-content-off'));
         
                        document.querySelector('.friends-subtitle').innerText = 'Connections (' + data.length + ') (Injected)';
         
                        sessionStorage.setItem('friends-' + baseUrl[3], JSON.stringify(data));
                        
                        listing = true;
                        listFriends(data, 1);
         
                        dispatchNavigationController(data);
                     }
                  }
               }, 2000);
         } else {
            let data = JSON.parse(item);

            setTimeout(async () => {
               if (data.length > 0) {
                  let ul = document.querySelector('.avatar-cards');
         
                  if (!ul) {
                     document.querySelector('.friends-content').removeChild(document.querySelector('.section-content-off'));
         
                     document.querySelector('.friends-subtitle').innerText = 'Connections (' + data.length + ') (Injected)';
                     
                     listing = true;
                     await listFriends(data, 1);
         
                     dispatchNavigationController(data);
                  }
               }
            }, 2000);
         }
      }
   })();
}