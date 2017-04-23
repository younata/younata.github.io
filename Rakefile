task :push do |t|
  remove_gps_from_assets
  git_push
end

def remove_gps_from_assets
  `find 'assets' -type f -name '*.jpg' | while read FILENAME; do; exiftool -all= -overwrite_original_in_place "${FILENAME}"; done;`
  `git add assets`
  `git commit --amend -CHEAD`
end

def git_push
  `git push origin master`
end
