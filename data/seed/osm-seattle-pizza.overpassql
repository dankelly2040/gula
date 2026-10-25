[out:json][timeout:60];
area["name"="Seattle"]["boundary"="administrative"]["admin_level"="8"]->.a;
(
  nwr["cuisine"~"pizza"](area.a);
  nwr["amenity"~"restaurant|fast_food|cafe"]["name"~"[Pp]izz"](area.a);
);
out center tags;
